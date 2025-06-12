// Community Create Form JavaScript

function communityCreateFormAddRule() {
    const container = document.querySelector('.community-create-form-rules-container');
    const ruleCount = container.children.length + 1;
    const ruleItem = document.createElement('div');
    ruleItem.className = 'community-create-form-rule-item';
    ruleItem.innerHTML = `
        <input type="text" placeholder="Rule ${ruleCount}: Enter rule text" name="rules[]">
        <button type="button" class="community-create-form-remove-rule" onclick="communityCreateFormRemoveRule(this)">❌</button>
    `;
    container.appendChild(ruleItem);
}

function communityCreateFormRemoveRule(button) {
    button.parentElement.remove();
}

function communityCreateFormSetColor(color) {
    document.getElementById('community-create-form-color').value = color;
    communityCreateFormUpdatePreview();
}

function communityCreateFormSetEmoji(emoji) {
    document.getElementById('community-create-form-emoji').value = emoji;
    communityCreateFormUpdatePreview();
}

function communityCreateFormUploadAvatar() {
    alert('Avatar upload functionality would be implemented here');
}

function communityCreateFormUploadBanner() {
    alert('Banner upload functionality would be implemented here');
}

function communityCreateFormSaveDraft() {
    alert('Community saved as draft');
}

function communityCreateFormPreviewCommunity() {
    document.getElementById('community-create-form-preview-panel').classList.add('active');
    communityCreateFormUpdatePreview();
}

function communityCreateFormClosePreview() {
    document.getElementById('community-create-form-preview-panel').classList.remove('active');
}

function communityCreateFormUpdatePreview() {
    const name = document.getElementById('community-create-form-name').value || 'Community Name';
    const description = document.getElementById('community-create-form-description').value || 'Community description will appear here...';
    const category = document.getElementById('community-create-form-category').value || 'Category';
    const emoji = document.getElementById('community-create-form-emoji').value || '🏍️';
    const color = document.getElementById('community-create-form-color').value;
    
    document.getElementById('community-create-form-preview-name').textContent = name;
    document.getElementById('community-create-form-preview-description').textContent = description;
    document.getElementById('community-create-form-preview-category').textContent = category;
    document.getElementById('community-create-form-preview-avatar').textContent = emoji;
    document.getElementById('community-create-form-preview-banner').style.background = `linear-gradient(135deg, ${color}, ${color}aa)`;
}

// Real-time preview updates
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('community-create-form-name');
    const descriptionInput = document.getElementById('community-create-form-description');
    const categorySelect = document.getElementById('community-create-form-category');
    const emojiInput = document.getElementById('community-create-form-emoji');
    const colorInput = document.getElementById('community-create-form-color');
    
    if (nameInput) nameInput.addEventListener('input', communityCreateFormUpdatePreview);
    if (descriptionInput) descriptionInput.addEventListener('input', communityCreateFormUpdatePreview);
    if (categorySelect) categorySelect.addEventListener('change', communityCreateFormUpdatePreview);
    if (emojiInput) emojiInput.addEventListener('input', communityCreateFormUpdatePreview);
    if (colorInput) colorInput.addEventListener('change', communityCreateFormUpdatePreview);
    
    // Form submission
    const form = document.getElementById('community-create-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Community creation would be processed here');
        });
    }
});

// Make functions globally available
window.communityCreateFormAddRule = communityCreateFormAddRule;
window.communityCreateFormRemoveRule = communityCreateFormRemoveRule;
window.communityCreateFormSetColor = communityCreateFormSetColor;
window.communityCreateFormSetEmoji = communityCreateFormSetEmoji;
window.communityCreateFormUploadAvatar = communityCreateFormUploadAvatar;
window.communityCreateFormUploadBanner = communityCreateFormUploadBanner;
window.communityCreateFormSaveDraft = communityCreateFormSaveDraft;
window.communityCreateFormPreviewCommunity = communityCreateFormPreviewCommunity;
window.communityCreateFormClosePreview = communityCreateFormClosePreview;