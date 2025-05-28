document.addEventListener("DOMContentLoaded", function() {
    const btnToggle = document.getElementById('search-toggle');
    const formSearch = document.getElementById('search-form');
    const inputSearch = document.getElementById('search-input');
  
    btnToggle.addEventListener('click', () => {
      if (formSearch.style.display === 'none' || formSearch.style.display === '') {
        formSearch.style.display = 'inline-block';
        inputSearch.focus();
      } else {
        formSearch.style.display = 'none';
      }
    });
  
    formSearch.addEventListener('submit', (e) => {
      if (!inputSearch.value.trim()) {
        e.preventDefault();
        inputSearch.focus();
      }
    });
  });