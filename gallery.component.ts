// Angular Gallery v1.0
// https://github.com/JulianStoev/AngularGallery

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

interface storedImageInterface {
  calcWidth: number;
  width: number;
  height: number;
  loaded: number;
  src: string;
}

type slidesInterface = 'slidePrePrev' | 'slidePrev' | 'slideMain' | 'slideNext' | 'slideNextNext';

interface preloadImageInterface {
  index: number;
  slide?: slidesInterface;
  callback?: () => void;
}

interface configInterface {
  transitionDuration: number;
  src: string;
}

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryComponent implements AfterViewInit, OnDestroy {

  constructor(
    private ngzone: NgZone
  ) { }

  @ViewChild('gallery') private gallery!: ElementRef;
  @ViewChild('slider') private slider!: ElementRef;
  @ViewChild('slidePrePrev') private slidePrePrev!: ElementRef;
  @ViewChild('slidePrev') private slidePrev!: ElementRef;
  @ViewChild('slideMain') private slideMain!: ElementRef;
  @ViewChild('slideNext') private slideNext!: ElementRef;
  @ViewChild('slideNextNext') private slideNextNext!: ElementRef;

  public photos!: Array<any>;
  @Input('photos') set setPhotos(photos: Array<any>) {
    this.photos = photos;
    this.images.onChange();
  }

  public index = 0;
  @Input('index') set setIndex(index: number) {
    this.index = index;
    this.slides.order.set();
    this.images.loadAandPrepare(() => {
      this.slides.center();
    });
  }

  @Output() output: EventEmitter<any> = new EventEmitter();

  public isFullscreen$ = new BehaviorSubject(false);
  public isMobile$ = new BehaviorSubject(window.innerWidth < 768);

  public config = {
    transitionDuration: 300,
    src: 'src'
  } as configInterface;
  @Input('config') set setConfig(config: configInterface) {
    this.config = config;
    this.images.onChange();
  }

  public emitter(action: string): void {
    let data = undefined;
    switch(action) {
      case 'change':
        data = this.index;
        break;

      case 'fullscreen':
        data = this.tools.getVal(this.isFullscreen$);
        break;
    }

    this.output.emit({
      action: action,
      data: data
    });
  }  

  ngAfterViewInit(): void {
    this.images.init();
    this.listeners.add.keyboard();
  }

  public swipe = {
    swipeCoord: [0, 0],
    swipeTime: 0,
    end: (e: TouchEvent): void => {
      if (this.zoom.active) {
        return;
      }
      this.slideMain.nativeElement.style.transform = '';
      const coord = [e.changedTouches[0].pageX, e.changedTouches[0].pageY];
      const direction = [coord[0] - this.swipe.swipeCoord[0], coord[1] - this.swipe.swipeCoord[1]];
      if ((new Date().getTime() - this.swipe.swipeTime) < 1000 && Math.abs(direction[1]) < Math.abs(direction[0]) && Math.abs(direction[0]) > 30) {
        this.slides.animate(direction[0] < 0 ? 'next' : 'prev');
      }
    },
    start: (e: TouchEvent): void => {
      if (this.zoom.active) {
        return;
      }
      this.swipe.swipeCoord = [e.changedTouches[0].pageX, e.changedTouches[0].pageY];
      this.swipe.swipeTime = new Date().getTime();
    },
    move: (e: TouchEvent): void => {
      e.preventDefault();
    }
  };

  private images = {
    stored: new Map(),
    storedCount: 0,
    onChange: (): void => {
      if (!this.photos || !this.photos[0] || !this.config.src) {
        return;
      }
      this.images.stored.clear();
      this.photos.forEach((photo, index: number) => {
        this.images.stored.set(index, {src: photo[this.config.src]});
      });
      this.images.storedCount = this.images.stored.size - 1;
      this.images.init();
      this.listeners.add.resize();
    },
    init: (): void => {
      this.slides.order.set();
      this.images.loadAandPrepare(() => {
        this.slides.center();
      });

      setTimeout(() => {
        this.images.preloadAdditional();
      }, 1000);
    },
    validateIndex: (index: number): number => {
      if (this.images.stored.has(index)) {
        return index;
      }
      if (index < this.images.storedCount) {
        return this.images.storedCount;
      }
      return 0;
    },
    calcWidth: (img: {width: number, height: number}): number => {
      if (this.tools.getVal(this.isMobile$)) {
        return this.gallery.nativeElement.offsetWidth;
      }
      if (!img.width) {
        img.width = 800;
      }
      if (!img.height) {
        img.height = 600;
      }
      let width = this.slider.nativeElement.offsetHeight * (img.width / img.height);
      if (width > this.gallery.nativeElement.offsetWidth) {
        width = this.gallery.nativeElement.offsetWidth;
      }
      return width;
    },
    load: (data: preloadImageInterface): void => {
      if (!this.gallery) {
        return;
      }
      const storedImg = this.images.stored.get(data.index) as storedImageInterface;
      if (storedImg !== undefined && storedImg.loaded === 1) {
        if (data.slide) {
          this.slides.set(storedImg, data.slide);
        }
        if (data.callback) {
          data.callback();
        }
        return;
      }

      if (data.slide) {
        this.slides.set({src: '', calcWidth: (this.tools.getVal(this.isMobile$) ? this.gallery.nativeElement.offsetWidth : 800)} as storedImageInterface, data.slide);
      }

      const img = new Image();

      const processImg = (loaded: number): void => {
        const imgObj = {
          calcWidth: this.images.calcWidth(img),
          width: img.width,
          height: img.height,
          loaded: loaded
        } as storedImageInterface;
        this.images.stored.set(data.index, imgObj);
        imgObj.src = this.photos[data.index][this.config.src];
        if (data.slide) {
          this.slides.set(imgObj, data.slide);
        }
        if (data.callback) {
          data.callback();
        }
      };

      img.onload = (): void => {
        processImg(1);
      };
      img.onerror = (): void => {
        processImg(0);
      };
      img.src = this.photos[data.index][this.config.src];
    },
    loadAandPrepare: (callback?: () => void): void => {
      this.images.load({index: this.slides.order.slideMain, slide: 'slideMain', callback: callback});
      this.images.load({index: this.slides.order.slidePrev, slide: 'slidePrev', callback: callback});
      this.images.load({index: this.slides.order.slidePrePrev, slide: 'slidePrePrev', callback: callback});
      this.images.load({index: this.slides.order.slideNext, slide: 'slideNext', callback: callback});
      this.images.load({index: this.slides.order.slideNextNext, slide: 'slideNextNext', callback: callback});
    },
    preloadAdditional: (): void => {
      this.images.load({index: this.images.validateIndex(this.slides.order.slideNextNext + 1)});
      this.images.load({index: this.images.validateIndex(this.slides.order.slidePrePrev - 1)});
    }
  };

  private tools = {
    getVal: (item: any): boolean => {
      let result = false;
      item.subscribe((isMobile: any) => {
        result = isMobile;
      }).unsubscribe();
      return result;
    }
  };

  public slides = {
    animateLock: false,
    order: {
      slideMain: 0,
      slideNext: 0,
      slideNextNext: 0,
      slidePrev: 0,
      slidePrePrev: 0,
      set: (): void => {
        this.slides.order.slideMain = this.index;
        this.slides.order.slideNext = this.images.validateIndex(this.slides.order.slideMain + 1);
        this.slides.order.slideNextNext = this.images.validateIndex(this.slides.order.slideNext + 1);
        this.slides.order.slidePrev = this.images.validateIndex(this.slides.order.slideMain - 1);
        this.slides.order.slidePrePrev = this.images.validateIndex(this.slides.order.slidePrev - 1);
      }
    },
    set: (img: storedImageInterface, slide: slidesInterface): void => {
      if (!this[slide]) {
        return;
      }
      this[slide].nativeElement.style.width = `${img.calcWidth}px`;
      this[slide].nativeElement.style.backgroundImage = `url(${img.src})`;
    },
    center: (): void => {
      const calc = (this.gallery.nativeElement.offsetWidth / 2) - (this.images.stored.get(this.slides.order.slidePrev).calcWidth + this.images.stored.get(this.slides.order.slidePrePrev).calcWidth + (this.images.stored.get(this.slides.order.slideMain).calcWidth / 2));
      this.slider.nativeElement.style.left = `${calc}px`;
    },
    arrow: (dir: 'next' | 'prev', e: Event): void => {
      e.stopPropagation();
      this.slides.animate(dir);
    },
    animate: (dir: 'next' | 'prev'): void => {
      if (this.slides.animateLock) {
        return;
      }
      this.slides.animateLock = true;
      this.slider.nativeElement.style.transition = `${this.config.transitionDuration}ms ease-out`;

      let left = 0;

      if (dir === 'next') {
        left = (this.images.stored.get(this.slides.order.slidePrev).calcWidth + this.images.stored.get(this.slides.order.slidePrePrev).calcWidth + this.images.stored.get(this.slides.order.slideMain).calcWidth) - ((this.gallery.nativeElement.offsetWidth - this.images.stored.get(this.slides.order.slideNext).calcWidth) / 2);
        this.index = this.images.validateIndex(this.index + 1);
      } else {
        if (this.tools.getVal(this.isMobile$)) {
          left = (this.images.stored.get(this.slides.order.slidePrePrev).calcWidth) - ((this.gallery.nativeElement.offsetWidth - this.images.stored.get(this.slides.order.slidePrev).calcWidth) / 2);
        } else {
          const offset = (this.gallery.nativeElement.offsetWidth / 2) - ((this.images.stored.get(this.slides.order.slideMain).calcWidth / 2) + (this.images.stored.get(this.slides.order.slidePrev).calcWidth + this.images.stored.get(this.slides.order.slidePrePrev).calcWidth));
          left = offset + (this.images.stored.get(this.slides.order.slideMain).calcWidth / 2) + (this.images.stored.get(this.slides.order.slidePrev).calcWidth / 2);
        }
        this.index = this.images.validateIndex(this.index - 1);
      }

      this.slideMain.nativeElement.classList.remove('active');
      const element = (dir === 'next' ? this.slideNext.nativeElement : this.slidePrev.nativeElement);
      element.classList.add('active');

      this.slider.nativeElement.style.left = `${(this.tools.getVal(this.isMobile$) || dir === 'next') ? '-' : ''}${left}px`;

      setTimeout(() => {
        this.slider.nativeElement.style.transition = '';
        this.slides.order.set();

        setTimeout(() => {
          this.slideMain.nativeElement.classList.add('active');
          element.classList.remove('active');
          this.images.loadAandPrepare();
  
          this.slides.center();
          this.listeners.add.zoom();
          this.slides.animateLock = false;
          this.emitter('change');
        });
      }, this.config.transitionDuration + 10);

      this.images.preloadAdditional();
    }
  };

  public actions = {
    fullscreen: (action: 'toggle' | 'open' | 'close', slide?: slidesInterface): void => {
      switch(action) {
        case 'toggle':
          if (slide) {
            this.index = this.slides.order[slide];
            this.slides.order.set();
            this.images.loadAandPrepare(() => {
              this.slides.center();
            });
          }
          this.bodyScroll.toggle();
          // eslint-disable-next-line no-case-declarations
          const active = this.tools.getVal(this.isFullscreen$);
          this.isFullscreen$.next(!active);
          if (!active) {
            this.listeners.add.zoom();
          }
          break;

        case 'open':
          this.bodyScroll.lock();
          this.isFullscreen$.next(true);
          this.listeners.add.zoom();
          break;

        case 'close':
          this.listeners.remove.zoom();
          this.bodyScroll.unlock();
          this.isFullscreen$.next(false);
          break;
      }
      setTimeout(() => {
        this.actions.resize();
        this.slides.center();
        this.emitter('fullscreen');
      });
    },
    resize: (e?: Event): void => {
      const currentMobileState = window.innerWidth < 768;
      if (this.tools.getVal(this.isMobile$) !== currentMobileState) {
        this.isMobile$.next(currentMobileState);
      }
      this.images.stored.forEach((image: storedImageInterface) => {
        if (image.loaded === 1) {
          image.calcWidth = this.images.calcWidth(image);
        }
      });
      this.images.loadAandPrepare();
      this.slides.center();
    }
  };

  private listeners = {
    add: {
      resize: (): void => {
        this.ngzone.runOutsideAngular(() => {
          window.addEventListener('resize', this.actions.resize);
        });
      },
      keyboard: (): void => {
        if (this.tools.getVal(this.isMobile$)) {
          return;
        }
        this.ngzone.runOutsideAngular(() => {
          document.addEventListener('keyup', this.keyUp);
        });
      },
      zoom: (): void => {
        this.zoom.listeners('set');
      }
    },
    remove: {
      resize: (): void => {
        window.removeEventListener('resize', this.actions.resize);
      },
      keyboard: (): void => {
        document.removeEventListener('keyup', this.keyUp);
      },
      zoom: (): void => {
        this.zoom.listeners('unset');
      }
    }
  };

  private keyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowRight':
        this.slides.animate('next');
        break;

      case 'ArrowLeft':
        this.slides.animate('prev');
        break;

      case 'Escape':
        if (this.isFullscreen$) {
          this.ngzone.run(() => {
            this.actions.fullscreen('close');
          });
        }
        break;
    }
  };

  private zoom = {
    active: false,
    touchScreen: ('ontouchstart' in window || navigator.msMaxTouchPoints),
    start: {
      x: 0,
      y: 0,
      distance: 0
    },
    distance: (e: TouchEvent): number => {
      return Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    },
    listeners: (action: 'set' | 'unset'): void => {
      if (!this.zoom.touchScreen) {
        return;
      }
      const listener = (action === 'set' ? 'addEventListener' : 'removeEventListener');
      this.slideMain.nativeElement[listener]('touchstart', this.zoom.touchstart);
      this.slideMain.nativeElement[listener]('touchend', this.zoom.touchend);
      this.slideMain.nativeElement[listener]('touchmove', this.zoom.touchmove);
    },
    touchstart: (e: TouchEvent): void => {
      if (e.touches.length !== 2) {
        return;
      }
      e.preventDefault();

      this.zoom.active = true;

      this.zoom.start.x = (e.touches[0].pageX + e.touches[1].pageX) / 2;
      this.zoom.start.y = (e.touches[0].pageY + e.touches[1].pageY) / 2;
      this.zoom.start.distance = this.zoom.distance(e);
    },
    touchend: (e: TouchEvent): void => {
      this.slideMain.nativeElement.style.transform = '';
      setTimeout(() => {
        this.zoom.active = false;
      }, 100);
    },
    touchmove: (e: TouchEvent): void => {
      if (e.touches.length !== 2) {
        return;
      }
      e.preventDefault();

      const scale = ((e as any).scale ? (e as any).scale : this.zoom.distance(e) / this.zoom.start.distance);
      const elementScale = Math.min(Math.max(1, scale), 4);

      const deltaX = (((e.touches[0].pageX + e.touches[1].pageX) / 2) - this.zoom.start.x) * 2;
      const deltaY = (((e.touches[0].pageY + e.touches[1].pageY) / 2) - this.zoom.start.y) * 2;

      const transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${elementScale})`;
      this.slideMain.nativeElement.style.transform = transform;
    }
  };

  private bodyScroll = {
    active: false,
    top: 0,
    lock: (state?: string): void => {
      if (this.bodyScroll.active === true) return;
      if (state == 'scroll-top') {
        document.body.style.top = '';
        this.bodyScroll.top = 0;
        window.scrollTo(0, 0);
        return;
      }
      this.bodyScroll.top = window.pageYOffset;
      document.body.style.top = '-'+ this.bodyScroll.top +'px';
      document.body.classList.add('body-scroll-lock');
      this.bodyScroll.active = true;
    },
    unlock: (): void => {
      if (this.bodyScroll.active === false) return;
      document.body.style.top = '';
      document.body.classList.remove('body-scroll-lock');
      window.scrollTo(0, this.bodyScroll.top);
      this.bodyScroll.top = 0;
      this.bodyScroll.active = false;
    },
    toggle: (): void => {
      if (this.bodyScroll.active) {
        this.bodyScroll.unlock();
      } else {
        this.bodyScroll.lock();
      }
    }
  };

  ngOnDestroy(): void {
    Object.keys(this.listeners.remove).forEach(key => {
      (this.listeners.remove as any)[key]();
    });
  }

}
