/**
 * Japanese Website Utilities
 * Handles Japanese encoding and text processing
 */

const axios = require('axios');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

/**
 * Fetch page with Japanese encoding support
 */
async function fetchJapanesePage(url, options = {}) {
  const config = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ja,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers
    },
    timeout: 30000,
    responseType: 'arraybuffer', // Get raw bytes to handle encoding
    ...options
  };

  try {
    console.log(`Fetching Japanese page: ${url}`);
    const response = await axios.get(url, config);
    
    // Detect encoding from headers or content
    const contentType = response.headers['content-type'] || '';
    let encoding = 'utf-8'; // Default
    
    // Check Content-Type header for charset
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    if (charsetMatch) {
      encoding = charsetMatch[1].toLowerCase();
    }
    
    // Convert buffer to string with proper encoding
    let html;
    if (encoding === 'shift_jis' || encoding === 'shift-jis' || encoding === 'sjis') {
      html = iconv.decode(response.data, 'Shift_JIS');
    } else if (encoding === 'euc-jp') {
      html = iconv.decode(response.data, 'EUC-JP');
    } else {
      // Default to UTF-8
      html = iconv.decode(response.data, 'utf-8');
    }
    
    // Also check meta tags for charset
    const $ = cheerio.load(html);
    const metaCharset = $('meta[charset]').attr('charset') || 
                       $('meta[http-equiv="Content-Type"]').attr('content');
    
    if (metaCharset && metaCharset.includes('shift_jis')) {
      // Re-decode if we detected Shift-JIS in meta
      html = iconv.decode(response.data, 'Shift_JIS');
    }
    
    console.log(`✓ Fetched with encoding: ${encoding}`);
    return html;
    
  } catch (error) {
    console.error(`Error fetching Japanese page ${url}:`, error.message);
    throw error;
  }
}

/**
 * Japanese to English label mapping for specifications
 */
const JAPANESE_SPEC_LABELS = {
  // Dimensions
  '全長': 'total_length',
  '全幅': 'total_width',
  '全高': 'total_height',
  '軸間距離': 'wheelbase',
  'ホイールベース': 'wheelbase',
  '最低地上高': 'ground_clearance',
  'シート高': 'seat_height',
  
  // Weight
  '車両重量': 'vehicle_weight',
  '装備重量': 'curb_weight',
  '乾燥重量': 'dry_weight',
  '最大積載量': 'max_payload',
  
  // Engine
  'エンジン型式': 'engine_model',
  'エンジン種類': 'engine_type',
  '総排気量': 'displacement',
  '内径×行程': 'bore_stroke',
  'ボア×ストローク': 'bore_stroke',
  '圧縮比': 'compression_ratio',
  '最高出力': 'max_power',
  '最大トルク': 'max_torque',
  '燃料供給方式': 'fuel_system',
  '始動方式': 'starting_method',
  '点火方式': 'ignition_type',
  '冷却方式': 'cooling_system',
  
  // Performance
  '燃料消費率': 'fuel_consumption',
  '燃費': 'fuel_economy',
  '燃料タンク容量': 'fuel_tank_capacity',
  '最高速度': 'top_speed',
  
  // Transmission
  '変速機形式': 'transmission_type',
  'クラッチ形式': 'clutch_type',
  '変速比': 'gear_ratios',
  
  // Chassis
  'フレーム形式': 'frame_type',
  'キャスター角': 'caster_angle',
  'トレール量': 'trail',
  '操舵角': 'steering_angle',
  
  // Suspension
  'フロントサスペンション': 'front_suspension',
  'リヤサスペンション': 'rear_suspension',
  'フロントホイールトラベル': 'front_travel',
  'リヤホイールトラベル': 'rear_travel',
  
  // Brakes
  'フロントブレーキ': 'front_brake',
  'リヤブレーキ': 'rear_brake',
  'ブレーキ形式': 'brake_type',
  
  // Tires
  'フロントタイヤ': 'front_tire',
  'リヤタイヤ': 'rear_tire',
  'タイヤサイズ（前）': 'front_tire_size',
  'タイヤサイズ（後）': 'rear_tire_size',
  
  // Electrical
  'バッテリー': 'battery',
  'ヘッドライト': 'headlight',
  'テールランプ': 'tail_light',
  
  // Other
  '乗車定員': 'seating_capacity',
  '車名・型式': 'model_type',
  '認定型式': 'type_approval',
  '製造事業者': 'manufacturer',
  '輸入事業者': 'importer',
  '最小回転半径': 'turning_radius'
};

/**
 * Extract and translate Japanese specifications
 */
function extractJapaneseSpecs($, tableSelector = '.spec-table, .spec_table, table.spec') {
  const specs = {};
  
  $(tableSelector).find('tr').each((i, row) => {
    const $row = $(row);
    let label = '';
    let value = '';
    
    // Try different table structures
    const $th = $row.find('th');
    const $td = $row.find('td');
    
    if ($th.length && $td.length) {
      // Standard th/td structure
      label = $th.text().trim();
      value = $td.text().trim();
    } else if ($td.length >= 2) {
      // Two td structure
      label = $($td[0]).text().trim();
      value = $($td[1]).text().trim();
    }
    
    if (label && value && value !== '-' && value !== '―') {
      // Translate Japanese label to English
      const englishKey = JAPANESE_SPEC_LABELS[label] || 
                        label.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
      
      specs[englishKey] = value;
      
      // Also store original Japanese label
      specs[`${englishKey}_ja`] = label;
    }
  });
  
  return specs;
}

/**
 * Parse Japanese numbers and units
 */
function parseJapaneseNumber(text) {
  if (!text) return null;
  
  // Remove Japanese commas
  text = text.replace(/[,，]/g, '');
  
  // Extract number
  const match = text.match(/[\d.]+/);
  if (match) {
    return parseFloat(match[0]);
  }
  
  return null;
}

/**
 * Extract model year from Japanese text
 */
function extractJapaneseYear(text) {
  if (!text) return null;
  
  // Look for Japanese year formats
  // 令和5年 (Reiwa 5 = 2023)
  const reiwaMatch = text.match(/令和(\d+)年/);
  if (reiwaMatch) {
    return 2019 + parseInt(reiwaMatch[1]) - 1;
  }
  
  // 平成30年 (Heisei 30 = 2018)
  const heiseiMatch = text.match(/平成(\d+)年/);
  if (heiseiMatch) {
    return 1989 + parseInt(heiseiMatch[1]) - 1;
  }
  
  // Western year format
  const westernMatch = text.match(/(\d{4})年/);
  if (westernMatch) {
    return parseInt(westernMatch[1]);
  }
  
  // Just 4 digits
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return parseInt(yearMatch[0]);
  }
  
  return null;
}

module.exports = {
  fetchJapanesePage,
  extractJapaneseSpecs,
  parseJapaneseNumber,
  extractJapaneseYear,
  JAPANESE_SPEC_LABELS
};