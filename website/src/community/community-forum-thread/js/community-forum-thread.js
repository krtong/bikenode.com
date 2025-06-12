// Community Forum Thread Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Like/Unlike functionality
    const likeButtons = document.querySelectorAll('.community-forum-thread-post-action:first-child');
    
    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('liked');
            const countSpan = this.querySelector('span:last-child');
            const currentCount = parseInt(countSpan.textContent);
            
            if (this.classList.contains('liked')) {
                countSpan.textContent = currentCount + 1;
            } else {
                countSpan.textContent = currentCount - 1;
            }
        });
    });
    
    // Thread actions (Follow, Bookmark, Share)
    const threadActions = document.querySelectorAll('.community-forum-thread-action-button');
    
    threadActions.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // Handle specific actions
            const actionText = this.querySelector('span:last-child').textContent;
            
            switch(actionText) {
                case 'Follow Thread':
                    if (this.classList.contains('active')) {
                        this.querySelector('span:last-child').textContent = 'Following';
                    } else {
                        this.querySelector('span:last-child').textContent = 'Follow Thread';
                    }
                    break;
                    
                case 'Bookmark':
                    if (this.classList.contains('active')) {
                        this.querySelector('span:last-child').textContent = 'Bookmarked';
                    } else {
                        this.querySelector('span:last-child').textContent = 'Bookmark';
                    }
                    break;
                    
                case 'Share':
                    // Simple share functionality
                    if (navigator.share) {
                        navigator.share({
                            title: document.title,
                            url: window.location.href
                        });
                    } else {
                        // Fallback - copy to clipboard
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                    }
                    break;
            }
        });
    });
    
    // Quote functionality
    const quoteButtons = document.querySelectorAll('.community-forum-thread-post-action:nth-child(2)');
    const replyTextarea = document.querySelector('.community-forum-thread-reply-textarea');
    
    quoteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const postBody = this.closest('.community-forum-thread-post-content')
                              .querySelector('.community-forum-thread-post-body');
            const authorName = this.closest('.community-forum-thread-post')
                                  .querySelector('.community-forum-thread-author-name').textContent;
            
            // Get selected text or first paragraph
            const selectedText = window.getSelection().toString() || 
                                postBody.querySelector('p').textContent;
            
            // Add quote to reply textarea
            const quoteText = `> ${authorName} said:\n> ${selectedText}\n\n`;
            replyTextarea.value = quoteText + replyTextarea.value;
            replyTextarea.focus();
            
            // Scroll to reply form
            document.querySelector('.community-forum-thread-reply-section')
                    .scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Toolbar functionality
    const toolbarButtons = document.querySelectorAll('.community-forum-thread-toolbar-button');
    
    toolbarButtons.forEach(button => {
        button.addEventListener('click', function() {
            const title = this.getAttribute('title');
            const textarea = replyTextarea;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            let replacement = '';
            
            switch(title) {
                case 'Bold':
                    replacement = `**${selectedText}**`;
                    break;
                case 'Italic':
                    replacement = `*${selectedText}*`;
                    break;
                case 'Quote':
                    replacement = `> ${selectedText}`;
                    break;
                case 'Link':
                    const url = prompt('Enter URL:');
                    if (url) {
                        replacement = `[${selectedText || 'Link text'}](${url})`;
                    }
                    break;
                case 'Image':
                    const imgUrl = prompt('Enter image URL:');
                    if (imgUrl) {
                        replacement = `![${selectedText || 'Image description'}](${imgUrl})`;
                    }
                    break;
            }
            
            if (replacement) {
                textarea.value = textarea.value.substring(0, start) + 
                                replacement + 
                                textarea.value.substring(end);
                textarea.focus();
                textarea.setSelectionRange(start + replacement.length, start + replacement.length);
            }
        });
    });
    
    // Report functionality
    const reportButtons = document.querySelectorAll('.community-forum-thread-post-action:last-child');
    
    reportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reason = prompt('Please provide a reason for reporting this post:');
            if (reason) {
                alert('Thank you for your report. Our moderators will review it shortly.');
                // Here you would normally send the report to your server
            }
        });
    });
    
    // Form submission
    const replyForm = document.querySelector('.community-forum-thread-reply-form');
    
    replyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const content = replyTextarea.value.trim();
        
        if (!content) {
            alert('Please enter a reply before submitting.');
            return;
        }
        
        // Here you would normally send the reply to your server
        console.log('Submitting reply:', content);
        
        alert('Reply posted successfully!');
        replyTextarea.value = '';
    });
});