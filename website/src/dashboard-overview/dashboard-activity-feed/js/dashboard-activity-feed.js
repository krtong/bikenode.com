// Dashboard Activity Feed JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Kudos interaction
  document.querySelectorAll('.activity-action').forEach(btn => {
    if (btn.textContent.includes('Kudos')) {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const kudosCount = btn.querySelector('.kudos-count');
        const currentCount = parseInt(kudosCount.textContent);
        if (btn.classList.contains('active')) {
          kudosCount.textContent = `${currentCount + 1} Kudos`;
        } else {
          kudosCount.textContent = `${currentCount - 1} Kudos`;
        }
      });
    }
  });

  // Post creation
  document.querySelector('.btn-primary').addEventListener('click', () => {
    const textarea = document.querySelector('.post-input');
    if (textarea.value.trim()) {
      alert('Post created!');
      textarea.value = '';
    }
  });
});