const animateDisplay = (() => {
    const container = document.getElementById('main-container');
    const block2 = document.getElementById('block-2');
    const block3 = document.getElementById('block-3');
    // checks screen width
    if (container.offsetWidth < 992) {
        // logic for 2nd block
        if (block2.getBoundingClientRect().top < 580 && !block2.classList.contains('fade-in')) {
            block2.classList.add('fade-in');
        } else if (block2.getBoundingClientRect().top >= 580 && block2.classList.contains('fade-in')) {
            block2.classList.remove('fade-in');
        }
        // logic for 3rd block
        if (block3.getBoundingClientRect().top < 580 && !block3.classList.contains('fade-in')) {
            block3.classList.add('fade-in');
        } else if (block3.getBoundingClientRect().top >= 580 && block3.classList.contains('fade-in')) {
            block3.classList.remove('fade-in');
        }
        // screen is lg
    } else {
        // logic for 2nd block
        if (block2.getBoundingClientRect().top < 610 && !block2.classList.contains('fade-in')) {
            block2.classList.add('fade-in');
        } else if (block2.getBoundingClientRect().top >= 610 && block2.classList.contains('fade-in')) {
            block2.classList.remove('fade-in');
        }

        // logic for 3rd block
        if (block3.getBoundingClientRect().top < 610 && !block3.classList.contains('fade-in')) {
            block3.classList.add('fade-in');
        } else if (block3.getBoundingClientRect().top >= 610 && block3.classList.contains('fade-in')) {
            block3.classList.remove('fade-in');
        }
    }
})
