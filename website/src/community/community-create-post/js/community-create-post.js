// Community Create Post Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.community-create-post-form');
    const previewButton = document.getElementById('previewButton');
    const postPreview = document.getElementById('postPreview');
    const previewContent = document.getElementById('previewContent');
    const tagsInput = document.getElementById('postTags');
    const tagsContainer = document.getElementById('tagsContainer');
    
    let tags = [];
    
    // Tags functionality
    tagsInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = this.value.trim();
            if (tag && !tags.includes(tag)) {
                tags.push(tag);
                renderTags();
                this.value = '';
            }
        }
    });
    
    function renderTags() {
        tagsContainer.innerHTML = '';
        tags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'community-create-post-tag';
            tagElement.innerHTML = `
                ${tag}
                <span class="community-create-post-tag-remove" data-index="${index}">×</span>
            `;
            tagsContainer.appendChild(tagElement);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.community-create-post-tag-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                tags.splice(index, 1);
                renderTags();
            });
        });
    }
    
    // Preview functionality
    previewButton.addEventListener('click', function() {
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const category = document.getElementById('postCategory').value;
        
        if (!title || !content) {
            alert('Please fill in the title and content before previewing.');
            return;
        }
        
        // Simple markdown to HTML conversion (basic)
        let html = content
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        
        previewContent.innerHTML = `
            <h3>${title}</h3>
            <p><small>Category: ${category || 'None'}</small></p>
            <div>${html}</div>
            ${tags.length > 0 ? `<p>Tags: ${tags.join(', ')}</p>` : ''}
        `;
        
        postPreview.style.display = 'block';
        postPreview.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const category = document.getElementById('postCategory').value;
        
        if (!title || !content || !category) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Here you would normally send the data to your server
        console.log('Submitting post:', {
            title,
            content,
            category,
            tags
        });
        
        alert('Post published successfully!');
        // Redirect to community page or the new post
        // window.location.href = '/community/';
    });
    
    // Cancel button
    const cancelButton = document.querySelector('.community-create-post-button-secondary');
    cancelButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.href = '/community/';
        }
    });
});