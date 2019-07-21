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

import {InputState} from "reactivestates";
import {HalLinkInterface} from 'core-app/modules/hal/hal-link/hal-link';
import {Injector} from '@angular/core';
import {States} from 'core-components/states.service';
import {I18nService} from 'core-app/modules/common/i18n/i18n.service';


export interface HalResourceClass<T extends HalResource = HalResource> {
  new(injector:Injector,
      source:any,
      $loaded:boolean,
      halInitializer:(halResource:T) => void,
      $halType:string):T;
}

export class HalResource {
  [attribute:string]:any;

  // The API type reported from API
  public _type:string;

  // The HalResource that this type maps to
  // This will almost always be equal to _type, however may be different for dynamic types
  // e.g., { _type: 'StatusFilterInstance', $halType: 'QueryFilterInstance' }.
  //
  // This is required for attributes to be correctly mapped according to their configuration.
  public $halType:string;

  protected readonly states:States = this.injector.get(States);
  protected readonly I18n:I18nService = this.injector.get(I18nService);

  /**
   * Constructs and initializes the HalResource. For this, the halResoureFactory is required.
   *
   * However, We can't inject the HalResourceFactory here because it itself depends on this class.
   * So if you need to initialize a HalResource, use +HalResourceFactory.createHalResource+ instead.
   *
   * @param {Injector} injector
   * @param $halType The HalResource type that this instance maps to
   * @param source
   * @param {boolean} $loaded
   * @param {Function} initializer The initializer callback to HAL-transform all linked and embedded resources.
   *
   */
  public constructor(public injector:Injector,
                     public source:any,
                     public $loaded:boolean,
                     public halInitializer:(halResource:any) => void,
                     $halType:string) {
    this.$halType = $halType;
    this.$initialize(source);
  }

  public static getEmptyResource(self:{ href:string|null } = { href: null }):any {
    return { _links: { self: self } };
  }

  public $links:any = {};
  public $embedded:any = {};
  public $self:Promise<this>;

  public _name:string;

  public static idFromLink(href:string):string {
    return href.split('/').pop()!;
  }

  public get idFromLink():string {
    if (this.$href) {
      return HalResource.idFromLink(this.$href);
    }

    return '';
  }

  public $initialize(source:any) {
    this.$source = source.$source || source;
    this.halInitializer(this);
  }

  /**
   * Returns the ID and ensures it's a string, null.
   * Returns a string when:
   *  - The embedded ID is actually set
   *  - The self link is terminated by a number.
   */
  public get id():string|null {
    if (this.$source.id) {
      return this.$source.id.toString();
    }

    const id = this.idFromLink;
    if (id.match(/^\d+$/)) {
      return id;
    }

    return null;
  }

  public set id(val:string|null) {
    this.$source.id = val;
  }

  public get persisted() {
    return !!(this.id && this.id !== 'new');
  }

  /**
   * Create a HalResource from the copied source of the given, other HalResource.
   *
   * @param {HalResource} other
   * @returns A HalResource with the identitical copied source of other.
   */
  public $copy<T extends HalResource = HalResource>(source:Object = {}):T {
    let clone:HalResourceClass<T>  = this.constructor as any;

    return new clone(this.injector, _.merge(this.$plain(), source), this.$loaded, this.halInitializer, this.$halType);
  }

  public $plain():any {
    return _.cloneDeep(this.$source);
  }

  public get $isHal():boolean {
    return true;
  }

  public get $link():HalLinkInterface {
    return this.$links.self.$link;
  }

  public get name():string {
    return this._name || this.$link.title || '';
  }

  public set name(name:string) {
    this._name = name;
  }

  /**
   * Alias for $href.
   */
  public get href():string|null {
    return this.$link.href;
  }

  public get $href():string|null {
    return this.$link.href;
  }

  /**
   * Return the associated state to this HAL resource, if any.
   */
  public get state():InputState<this>|null {
    return null;
  }

  public $load(force = false):Promise<this> {
    if (!this.state) {
      return this.$loadResource(force);
    }

    const state = this.state;

    if (force) {
      state.clear();
    }

    // If nobody has asked yet for the resource to be $loaded, do it ourselves.
    // Otherwise, we risk returning a promise, that will never be resolved.
    state.putFromPromiseIfPristine(() => this.$loadResource(force));

    return <Promise<this>> state.valuesPromise().then((source:any) => {
      this.$initialize(source);
      this.$loaded = true;
      return this;
    });
  }

  protected $loadResource(force = false):Promise<this> {
    if (!force) {
      if (this.$loaded) {
        return Promise.resolve(this);
      }

      if (!this.$loaded && this.$self) {
        return this.$self;
      }
    }

    // Reset and load this resource
    this.$loaded = false;
    this.$self = this.$links.self({}).then((source:any) => {
      this.$loaded = true;
      this.$initialize(source.$source);
      return this;
    });

    return this.$self;
  }

  /**
   * Update the resource ignoring the cache.
   */
  public $update() {
    return this.$load(true);
  }

  /**
   * Specify this resource's embedded keys that should be transformed with resources.
   * Use this to restrict, e.g., links that should not be made properties if you have a custom get/setter.
   */
  public $embeddableKeys():string[] {
    const properties = Object.keys(this.$source);
    return _.without(properties, '_links', '_embedded', 'id');
  }

  /**
   * Specify this resource's keys that should not be transformed with resources.
   * Use this to restrict, e.g., links that should not be made properties if you have a custom get/setter.
   */
  public $linkableKeys():string[] {
    const properties = Object.keys(this.$links);
    return _.without(properties, 'self');
  }
}
