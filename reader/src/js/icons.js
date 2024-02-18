import * as left2 from 'bundle-text:~/assets/icons/chevron-left-double-svgrepo-com.svg';
import * as left from 'bundle-text:~/assets/icons/chevron-left-svgrepo-com.svg';
import * as right2 from 'bundle-text:~/assets/icons/chevron-right-double-svgrepo-com.svg';
import * as right from 'bundle-text:~/assets/icons/chevron-right-svgrepo-com.svg';
import * as cross from 'bundle-text:~/assets/icons/cross-svgrepo-com.svg';
import * as expand from 'bundle-text:~/assets/icons/expand-svgrepo-com.svg';
import * as expandWidth from 'bundle-text:~/assets/icons/expand-width-svgrepo-com.svg';
import * as fullscreen from 'bundle-text:~/assets/icons/fullscreen-svgrepo-com.svg';
import * as menu from 'bundle-text:~/assets/icons/menu-hamburger-svgrepo-com.svg';

export function setIcons() {
    document.getElementById('buttonHideMenu').innerHTML = cross;
    document.getElementById('buttonLeftLeft').innerHTML = left2;
    document.getElementById('buttonLeft').innerHTML = left;
    document.getElementById('buttonRight').innerHTML = right;
    document.getElementById('buttonRightRight').innerHTML = right2;
    document.getElementById('dropbtn').innerHTML = menu;
    document.getElementById('menuFitToScreen').innerHTML = expand;
    document.getElementById('menuFitToWidth').innerHTML = expandWidth;
    document.getElementById('menuFullScreen').innerHTML = fullscreen;

    for (const el of document.getElementsByClassName('popupCloseButton')) {
        el.innerHTML = cross;
    }
}
