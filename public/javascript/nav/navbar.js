const updateNav = (() => {
    const nav = document.getElementById('nav-component');
    let scrollTop = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
    if(scrollTop >= 300) {
        if(!nav.classList.contains('nav-fixed')) {
            nav.className += ' nav-fixed';
        }
    } else {
        if(nav.classList.contains('nav-fixed')) {
            nav.classList.remove('nav-fixed');
        }
    }
})
