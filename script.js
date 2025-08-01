document.addEventListener('DOMContentLoaded', function() {
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                headerPlaceholder.innerHTML = data;
                updateLanguageLinks();
            }
        })
        .catch(error => console.error('Error loading header:', error));
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                footerPlaceholder.innerHTML = data;
            }
        })
        .catch(error => console.error('Error loading footer:', error));
});

//This function changes the link in the header page to link to the page in the other language, along with flag pics etc.
function updateLanguageLinks() {
    // Get the current page's filename (e.g., "index.html")
    const currentPage = window.location.pathname.split('/').pop();

    const langSwitcher = document.getElementById('language-switcher');
    const langLink = langSwitcher.querySelector('.language-link');
    const flagImg = langSwitcher.querySelector('.language-flag');
    const langText = langSwitcher.querySelector('.language-text');

    if (currentPage.includes('_ko.html')) {
        // We are on the Korean page, so the link should be to the English page
        langLink.href = currentPage.replace('_ko.html', '.html');
        flagImg.src = 'images/en_flag.png';
        langText.textContent = 'English';
    } else {
        // We are on the English page, so the link should be to the Korean page
        langLink.href = currentPage.replace('.html', '_ko.html');
        flagImg.src = 'images/ko_flag.png';
        langText.textContent = '한국어';
    }
}
