function updateNav() {
    const nav = document.getElementById('main-nav');
    let scrollTop = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
    if(scrollTop >= 300) {
        if(!nav.classList.contains('fixed-top')) {
            nav.className += ' fixed-top';
        }
    } else {
        if(nav.classList.contains('fixed-top')) {
            nav.classList.remove('fixed-top');
        }
    }
}

window.onload = function () {
    window.onscroll = updateNav;
};