# Angular Gallery
This is a shared module of Angular gallery that you can simply import in any Angular project. The Gallery relies only on Angular and RxJS.

## Demo
https://git.abyss-arts.com/gallery/

## Features
* Change detection free
* OnPush ready
* Strict mode friendly
* Touch zoom
* Keyboard events
* Fullscreen

## Sample Usage
1. Import the gallery.module in the Imports section of the module of the page where you need the gallery.
2. In the HTML of this page place the <app-gallery></app-gallery> tag where you wish your gallery to appear.

**The gallery will take the size of the container you put it in!**

* The output will tell you when events occur, like index change or going in and out of fullscreen.
* You can pass a config object if you wish:
  * **transitionDuration**: the duration of the animation in ms
  * **src**: the key name in the photos object that holds the source of the image
* **photos**: array with the photos to display
* **index**: you can change the current/starting index of the gallery

```
public photos = [
    {src: 'assets/car1.jpg'},
    {src: 'assets/car2.jpg'},
    {src: 'assets/car3.jpg'},
    {src: 'assets/car4.jpg'},
    {src: 'assets/car5.jpg'},
    {src: 'assets/car6.jpg'}
];
  
output(e) => {
  console.log(e);
}

myConfig = {
  transitionDuration: 300,
  src: 'src'
};

currentIndex = 0;
```
```
<app-gallery [photos]="photos" [config]="myConfig" [index]="currentIndex" (output)="output($event)"></app-gallery>
```
