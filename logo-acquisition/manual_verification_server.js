/**
 * Manual Logo Verification Web Interface
 * Provides a web interface for manually reviewing and approving logo candidates
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class LogoVerificationServer {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.baseDir = __dirname;
    this.setupMiddleware();
    this.setupRoutes();
    this.loadVerificationData();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(this.baseDir, 'public')));
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(this.baseDir, 'images', 'manual_uploads'));
      },
      filename: (req, file, cb) => {
        const brand = req.body.brand || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${brand.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}${ext}`);
      }
    });
    
    this.upload = multer({ 
      storage: storage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        cb(null, allowedMimes.includes(file.mimetype));
      }
    });
  }

  loadVerificationData() {
    try {
      const reportPath = path.join(this.baseDir, 'logo_verification_report.json');
      if (fs.existsSync(reportPath)) {
        this.verificationData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } else {
        this.verificationData = { manualTasks: [], searchResults: [] };
      }
    } catch (error) {
      console.error('Error loading verification data:', error);
      this.verificationData = { manualTasks: [], searchResults: [] };
    }
  }

  setupRoutes() {
    // Main verification interface
    this.app.get('/', (req, res) => {
      res.send(this.generateVerificationHTML());
    });

    // API: Get verification data
    this.app.get('/api/verification-data', (req, res) => {
      res.json(this.verificationData);
    });

    // API: Get brands needing manual work
    this.app.get('/api/manual-tasks', (req, res) => {
      const tasks = this.verificationData.manualTasks || [];
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 10;
      
      const startIndex = page * limit;
      const paginatedTasks = tasks.slice(startIndex, startIndex + limit);
      
      res.json({
        tasks: paginatedTasks,
        total: tasks.length,
        page: page,
        hasMore: startIndex + limit < tasks.length
      });
    });

    // API: Approve a logo candidate
    this.app.post('/api/approve-candidate', (req, res) => {
      const { brand, candidateUrl, source } = req.body;
      
      try {
        this.approveCandidate(brand, candidateUrl, source);
        res.json({ success: true, message: 'Candidate approved' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Reject a logo candidate
    this.app.post('/api/reject-candidate', (req, res) => {
      const { brand, candidateUrl, reason } = req.body;
      
      try {
        this.rejectCandidate(brand, candidateUrl, reason);
        res.json({ success: true, message: 'Candidate rejected' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Upload manual logo
    this.app.post('/api/upload-logo', this.upload.single('logoFile'), async (req, res) => {
      try {
        const { brand } = req.body;
        const uploadedFile = req.file;
        
        if (!uploadedFile) {
          return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Process the uploaded image
        const processedPath = await this.processUploadedLogo(uploadedFile.path, brand);
        
        // Mark as manually verified
        this.approveCandidate(brand, processedPath, 'manual_upload');
        
        res.json({ 
          success: true, 
          message: 'Logo uploaded and processed successfully',
          path: processedPath 
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Get logo search suggestions
    this.app.get('/api/search-suggestions/:brand', (req, res) => {
      const brand = req.params.brand;
      const suggestions = this.generateSearchSuggestions(brand);
      res.json(suggestions);
    });

    // API: Save verification progress
    this.app.post('/api/save-progress', (req, res) => {
      try {
        const progressPath = path.join(this.baseDir, 'logo_verification_report.json');
        fs.writeFileSync(progressPath, JSON.stringify(this.verificationData, null, 2));
        res.json({ success: true, message: 'Progress saved' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async processUploadedLogo(imagePath, brand) {
    try {
      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      
      // Generate output filename
      const outputFilename = `${brand.replace(/[^a-zA-Z0-9]/g, '_')}_verified.png`;
      const outputPath = path.join(this.baseDir, 'images', 'verified', outputFilename);
      
      // Process image: convert to PNG, ensure good quality
      await sharp(imagePath)
        .resize(512, 512, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 0 } 
        })
        .png({ quality: 100 })
        .toFile(outputPath);
      
      // Clean up original upload
      fs.unlinkSync(imagePath);
      
      return outputPath;
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  approveCandidate(brand, logoPath, source) {
    // Find the brand in verification data
    const brandTask = this.verificationData.manualTasks.find(task => task.brand === brand);
    if (brandTask) {
      brandTask.status = 'completed';
      brandTask.approvedLogo = logoPath;
      brandTask.approvedSource = source;
      brandTask.verifiedAt = new Date().toISOString();
    }
    
    // Also update search results if available
    const searchResult = this.verificationData.searchResults.find(result => result.brand === brand);
    if (searchResult) {
      searchResult.verified = true;
      searchResult.finalLogo = logoPath;
    }
    
    this.saveProgress();
  }

  rejectCandidate(brand, candidateUrl, reason) {
    const brandTask = this.verificationData.manualTasks.find(task => task.brand === brand);
    if (brandTask) {
      if (!brandTask.rejectedCandidates) {
        brandTask.rejectedCandidates = [];
      }
      brandTask.rejectedCandidates.push({
        url: candidateUrl,
        reason: reason,
        rejectedAt: new Date().toISOString()
      });
    }
    
    this.saveProgress();
  }

  generateSearchSuggestions(brand) {
    return {
      brand: brand,
      searchUrls: [
        `https://www.google.com/search?q=${encodeURIComponent(brand + ' motorcycle logo')}&tbm=isch`,
        `https://duckduckgo.com/?q=${encodeURIComponent(brand + ' logo')}&ia=images`,
        `https://seeklogo.com/search?q=${encodeURIComponent(brand)}`,
        `https://worldvectorlogo.com/search?q=${encodeURIComponent(brand)}`,
        `https://logos-world.net/search/?s=${encodeURIComponent(brand)}`
      ],
      officialWebsite: this.guessOfficialWebsite(brand)
    };
  }

  guessOfficialWebsite(brand) {
    const cleanBrand = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `https://www.${cleanBrand}.com`;
  }

  saveProgress() {
    const progressPath = path.join(this.baseDir, 'logo_verification_report.json');
    fs.writeFileSync(progressPath, JSON.stringify(this.verificationData, null, 2));
  }

  generateVerificationHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Motorcycle Logo Verification</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        
        .brand-task {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .brand-name {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        
        .task-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .task-type.manual-search {
            background: #fff3cd;
            color: #856404;
        }
        
        .task-type.manual-verification {
            background: #d4edda;
            color: #155724;
        }
        
        .candidates {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        
        .candidate {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            background: #fafafa;
        }
        
        .candidate img {
            max-width: 100%;
            max-height: 150px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        
        .candidate-info {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        
        .candidate-actions {
            display: flex;
            gap: 5px;
            justify-content: center;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }
        
        .btn-approve {
            background: #28a745;
            color: white;
        }
        
        .btn-approve:hover {
            background: #218838;
        }
        
        .btn-reject {
            background: #dc3545;
            color: white;
        }
        
        .btn-reject:hover {
            background: #c82333;
        }
        
        .btn-search {
            background: #007bff;
            color: white;
        }
        
        .btn-search:hover {
            background: #0056b3;
        }
        
        .upload-section {
            background: #e3f2fd;
            border: 2px dashed #1976d2;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 15px 0;
        }
        
        .upload-input {
            margin: 10px 0;
        }
        
        .search-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        
        .search-link {
            padding: 8px 12px;
            background: #f8f9fa;
            color: #007bff;
            text-decoration: none;
            border-radius: 4px;
            font-size: 0.9em;
            border: 1px solid #dee2e6;
        }
        
        .search-link:hover {
            background: #e9ecef;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏍️ Motorcycle Logo Verification System</h1>
            <p>Manual verification and quality control for motorcycle brand logos</p>
            
            <div class="stats" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalBrands">-</div>
                    <div class="stat-label">Total Brands</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="completedCount">-</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="pendingCount">-</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="progressPercentage">-</div>
                    <div class="stat-label">Progress</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
            </div>
        </div>
        
        <div id="tasksContainer">
            <div class="loading">
                Loading verification tasks...
            </div>
        </div>
        
        <div class="pagination" id="pagination">
            <!-- Pagination buttons will be added here -->
        </div>
    </div>

    <script>
        class LogoVerificationUI {
            constructor() {
                this.currentPage = 0;
                this.limit = 5;
                this.loadData();
            }
            
            async loadData() {
                try {
                    const response = await fetch('/api/verification-data');
                    this.verificationData = await response.json();
                    this.updateStats();
                    this.loadTasks();
                } catch (error) {
                    console.error('Error loading data:', error);
                }
            }
            
            updateStats() {
                const completed = this.verificationData.completed || 0;
                const total = this.verificationData.totalBrands || 0;
                const pending = this.verificationData.pending || 0;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                document.getElementById('totalBrands').textContent = total;
                document.getElementById('completedCount').textContent = completed;
                document.getElementById('pendingCount').textContent = pending;
                document.getElementById('progressPercentage').textContent = progress + '%';
                document.getElementById('progressFill').style.width = progress + '%';
            }
            
            async loadTasks() {
                try {
                    const response = await fetch(\`/api/manual-tasks?page=\${this.currentPage}&limit=\${this.limit}\`);
                    const data = await response.json();
                    this.renderTasks(data.tasks);
                    this.renderPagination(data);
                } catch (error) {
                    console.error('Error loading tasks:', error);
                }
            }
            
            renderTasks(tasks) {
                const container = document.getElementById('tasksContainer');
                
                if (tasks.length === 0) {
                    container.innerHTML = '<div class="loading">No pending tasks found!</div>';
                    return;
                }
                
                container.innerHTML = tasks.map(task => this.renderTask(task)).join('');
            }
            
            renderTask(task) {
                const taskTypeClass = task.task === 'manual_search' ? 'manual-search' : 'manual-verification';
                const taskTypeText = task.task === 'manual_search' ? 'Manual Search Required' : 'Manual Verification';
                
                let candidatesHTML = '';
                if (task.candidates && task.candidates.length > 0) {
                    candidatesHTML = \`
                        <div class="candidates">
                            \${task.candidates.map((candidate, index) => \`
                                <div class="candidate">
                                    <img src="\${candidate.url}" alt="Logo candidate" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+'">
                                    <div class="candidate-info">
                                        Source: \${candidate.source}<br>
                                        Confidence: \${Math.round((candidate.confidence || 0) * 100)}%
                                    </div>
                                    <div class="candidate-actions">
                                        <button class="btn btn-approve" onclick="ui.approveCandidate('\${task.brand}', '\${candidate.url}', '\${candidate.source}')">
                                            ✓ Approve
                                        </button>
                                        <button class="btn btn-reject" onclick="ui.rejectCandidate('\${task.brand}', '\${candidate.url}')">
                                            ✗ Reject
                                        </button>
                                    </div>
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                const searchLinksHTML = \`
                    <div class="search-links">
                        <a href="https://www.google.com/search?q=\${encodeURIComponent(task.brand + ' motorcycle logo')}&tbm=isch" target="_blank" class="search-link">
                            🔍 Google Images
                        </a>
                        <a href="https://seeklogo.com/search?q=\${encodeURIComponent(task.brand)}" target="_blank" class="search-link">
                            📝 SeekLogo
                        </a>
                        <a href="https://worldvectorlogo.com/search?q=\${encodeURIComponent(task.brand)}" target="_blank" class="search-link">
                            🌐 WorldVectorLogo
                        </a>
                        <a href="https://www.\${task.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com" target="_blank" class="search-link">
                            🏠 Official Website
                        </a>
                    </div>
                \`;
                
                const uploadHTML = \`
                    <div class="upload-section">
                        <h4>Upload Manual Logo</h4>
                        <p>Found a better logo? Upload it here (PNG, JPG, SVG accepted)</p>
                        <input type="file" class="upload-input" accept="image/*" id="upload_\${task.brand.replace(/[^a-zA-Z0-9]/g, '_')}">
                        <button class="btn btn-search" onclick="ui.uploadLogo('\${task.brand}')">
                            📤 Upload Logo
                        </button>
                    </div>
                \`;
                
                return \`
                    <div class="brand-task">
                        <div class="brand-name">\${task.brand}</div>
                        <div class="task-type \${taskTypeClass}">\${taskTypeText}</div>
                        <p>\${task.description}</p>
                        
                        \${candidatesHTML}
                        \${searchLinksHTML}
                        \${uploadHTML}
                    </div>
                \`;
            }
            
            renderPagination(data) {
                const container = document.getElementById('pagination');
                const totalPages = Math.ceil(data.total / this.limit);
                
                if (totalPages <= 1) {
                    container.innerHTML = '';
                    return;
                }
                
                let paginationHTML = '';
                
                if (this.currentPage > 0) {
                    paginationHTML += \`<button class="btn btn-search" onclick="ui.changePage(\${this.currentPage - 1})">Previous</button>\`;
                }
                
                paginationHTML += \`<span>Page \${this.currentPage + 1} of \${totalPages}</span>\`;
                
                if (this.currentPage < totalPages - 1) {
                    paginationHTML += \`<button class="btn btn-search" onclick="ui.changePage(\${this.currentPage + 1})">Next</button>\`;
                }
                
                container.innerHTML = paginationHTML;
            }
            
            changePage(page) {
                this.currentPage = page;
                this.loadTasks();
            }
            
            async approveCandidate(brand, candidateUrl, source) {
                try {
                    const response = await fetch('/api/approve-candidate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brand, candidateUrl, source })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Logo approved successfully!');
                        this.loadData();
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    alert('Error approving candidate: ' + error.message);
                }
            }
            
            async rejectCandidate(brand, candidateUrl) {
                const reason = prompt('Why is this logo not suitable?');
                if (!reason) return;
                
                try {
                    const response = await fetch('/api/reject-candidate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ brand, candidateUrl, reason })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Logo rejected');
                        this.loadTasks();
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    alert('Error rejecting candidate: ' + error.message);
                }
            }
            
            async uploadLogo(brand) {
                const fileInput = document.getElementById(\`upload_\${brand.replace(/[^a-zA-Z0-9]/g, '_')}\`);
                const file = fileInput.files[0];
                
                if (!file) {
                    alert('Please select a file first');
                    return;
                }
                
                const formData = new FormData();
                formData.append('logoFile', file);
                formData.append('brand', brand);
                
                try {
                    const response = await fetch('/api/upload-logo', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Logo uploaded and processed successfully!');
                        this.loadData();
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    alert('Error uploading logo: ' + error.message);
                }
            }
        }
        
        const ui = new LogoVerificationUI();
    </script>
</body>
</html>
    `;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 Logo Verification Server running at http://localhost:${this.port}`);
      console.log(`📊 Ready to verify motorcycle brand logos`);
    });
  }
}

// Create required directories
const requiredDirs = [
  path.join(__dirname, 'images', 'manual_uploads'),
  path.join(__dirname, 'images', 'verified'),
  path.join(__dirname, 'images', 'processed'),
  path.join(__dirname, 'public')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Start server if run directly
if (require.main === module) {
  const server = new LogoVerificationServer();
  server.start();
}

module.exports = { LogoVerificationServer };