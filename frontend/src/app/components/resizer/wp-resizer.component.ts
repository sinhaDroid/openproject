//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++

import {Component, ElementRef, HostListener, Injector, Input, OnDestroy, OnInit} from '@angular/core';
import {distinctUntilChanged} from 'rxjs/operators';
import {untilComponentDestroyed} from 'ng2-rx-componentdestroyed';
import {TransitionService} from '@uirouter/core';
import {MainMenuToggleService} from "core-components/main-menu/main-menu-toggle.service";
import {BrowserDetector} from "core-app/modules/common/browser/browser-detector.service";

@Component({
  selector: 'wp-resizer',
  template: `<div class="work-packages--resizer icon-resizer-vertical-lines"></div>`
})

export class WpResizerDirective implements OnInit, OnDestroy {
  @Input() elementClass:string;
  @Input() resizeEvent:string;
  @Input() localStorageKey:string;

  private resizingElement:HTMLElement;
  private elementFlex:number;
  private oldPosition:number;
  private mouseMoveHandler:any;
  private element:HTMLElement;

  public moving:boolean = false;

  constructor(readonly toggleService:MainMenuToggleService,
              private elementRef:ElementRef,
              readonly $transitions:TransitionService,
              readonly browserDetector:BrowserDetector) {
  }

  ngOnInit() {
    // Get element
    this.resizingElement = <HTMLElement>document.getElementsByClassName(this.elementClass)[0];

    // Get initial width from local storage and apply
    let localStorageValue = window.OpenProject.guardedLocalStorage(this.localStorageKey);
    this.elementFlex = localStorageValue ? parseInt(localStorageValue,
      10) : this.resizingElement.offsetWidth;

    // This case only happens when the timeline is loaded but not displayed.
    // Therefor the flexbasis will be set to 50%, just in px
    if (this.elementFlex === 0 && this.resizingElement.parentElement) {
      this.elementFlex = this.resizingElement.parentElement.offsetWidth / 2;
    }
    this.resizingElement.style.flexBasis = this.elementFlex + 'px';

    // Wait until dom content is loaded and initialize column layout
    // Otherwise function will be executed with empty list
    jQuery(document).ready(() => {
      this.applyColumnLayout(this.resizingElement, this.elementFlex);
    });

    // Add event listener
    this.element = this.elementRef.nativeElement;

    // Listen on sidebar changes and toggle column layout, if necessary
    this.toggleService.changeData$
      .pipe(
        distinctUntilChanged(),
        untilComponentDestroyed(this)
      )
      .subscribe( changeData => {
        this.toggleFullscreenColumns();
      });
    let that = this;
    jQuery(window).resize(function() {
      that.toggleFullscreenColumns();
    });
  }

  ngOnDestroy() {
    // Reset the style when killing this directive, otherwise the style remains
    this.resizingElement.style.flexBasis = null;
  }

  @HostListener('mousedown', ['$event'])
  private handleMouseDown(e:MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Only on left mouse click the resizing is started
    if (e.buttons === 1 || e.which === 1) {
      // Gettig starting position
      this.oldPosition = e.clientX;

      this.moving = true;

      // Necessary to encapsulate this to be able to remove the eventlistener later
      this.mouseMoveHandler = this.resizeElement.bind(this, this.resizingElement);

      // Change cursor icon
      // This is handled via JS to ensure
      // that the cursor stays the same even when the mouse leaves the actual resizer.
      document.getElementsByTagName("body")[0].setAttribute('style',
        'cursor: col-resize !important');

      // Enable mouse move
      window.addEventListener('mousemove', this.mouseMoveHandler);
      window.addEventListener('touchmove', this.mouseMoveHandler, { passive: false });
    }
  }

  @HostListener('window:touchend', ['$event'])
  private handleTouchEnd(e:MouseEvent) {
    window.removeEventListener('touchmove', this.mouseMoveHandler);
    let localStorageValue = window.OpenProject.guardedLocalStorage(this.localStorageKey);
    if (localStorageValue) {
      this.elementFlex = parseInt(localStorageValue, 10);
    }
  }

  @HostListener('window:mouseup', ['$event'])
  private handleMouseUp(e:MouseEvent):boolean {
    if (!this.moving) {
      return true;
    }

    // Disable mouse move
    window.removeEventListener('mousemove', this.mouseMoveHandler);

    // Change cursor icon back
    document.body.style.cursor = 'auto';

    // Take care at the end that the elementFlex-Value is the same as the actual value
    // When the mouseup is outside the container these values will differ
    // which will cause problems at the next movement start
    let localStorageValue = window.OpenProject.guardedLocalStorage(this.localStorageKey);
    if (localStorageValue) {
      this.elementFlex = parseInt(localStorageValue, 10);
    }

    this.moving = false;

    // Send a event that we resized this element
    const event = new Event(this.resizeEvent);
    window.dispatchEvent(event);

    return false;
  }

  private resizeElement(element:HTMLElement, e:MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Get delta to resize
    let delta = this.oldPosition - (e.clientX || e.pageX);
    this.oldPosition = (e.clientX || e.pageX);

    // Get new value depending on the delta
    // The resizingElement is not allowed to be smaller than 500px
    this.elementFlex = this.elementFlex + delta;
    let newValue = this.elementFlex < 500 ? 500 : this.elementFlex;

    // Store item in local storage
    window.OpenProject.guardedLocalStorage(this.localStorageKey, String(newValue));

    // Apply two column layout
    this.applyColumnLayout(element, newValue);

    // Set new width
    element.style.flexBasis = newValue + 'px';
  }

  private applyColumnLayout(element:HTMLElement, newWidth:number) {
    // Apply two column layout in fullscreen view of a workpackage
    if (element === jQuery('.work-packages-full-view--split-right')[0]) {
      this.toggleFullscreenColumns();
    }
    // Apply two column layout when details view of wp is open
    else {
      this.toggleColumns(element, 700);
    }
  }

  private toggleColumns(element:HTMLElement, checkWidth:number = 750) {
    // Disable two column layout for MS Edge (#29941)
    if (element && !this.browserDetector.isEdge) {
      jQuery(element).toggleClass('-can-have-columns', element.offsetWidth > checkWidth);
    }
  }

  private toggleFullscreenColumns() {
    let fullScreenLeftView = jQuery('.work-packages-full-view--split-left')[0];
    this.toggleColumns(fullScreenLeftView);
  }
}
