import {
  Component,
  Type,
  ViewChild,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  ComponentRef,
  SimpleChange,
  ViewEncapsulation,
} from '@angular/core';
import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';
import { ViewData } from '@angular/core/src/view'; // not exported from core (only for POC)
import { Component as MetaComponent } from '@sketchmine/code-analyzer';
import { asyncForEach } from '@sketchmine/helpers';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { MetaService } from './meta.service';
import { ExamplesRegistry } from './examples-registry';
import { checkSubComponents } from './check-sub-components';
import { waitForDraw, findComponentInstance, mutateVariants } from './utils';

export interface Variant {
  name: string;
  changes: VariantChange[];
}

export interface VariantChange {
  type: 'property' | 'method';
  key: string;
  value: string;
}

const BLACKLIST = [
  'loading-distractor',
  'expandable-section',
  'button-group',
  'context-dialog',
  'checkbox',
  'progress-circle',
  'switch',
  'breadcrumbs',
  'radio',
];

declare var window: any;

@Component({
  selector: 'app-root',
  template: '<div cdkPortalOutlet></div>',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {

  currentTheme = 'light-bg';
  metaSubscription: Subscription;
  @ViewChild(CdkPortalOutlet) portalOutlet: CdkPortalOutlet;
  constructor(
    private viewContainerRef: ViewContainerRef,
    private metaService: MetaService,
    private registry: ExamplesRegistry,
  ) { }

  ngOnInit() {
    console.log('ANGULAR: ngOnInit!');
    // get list of mapped examples in the examples module file
    const availableExamples = this.registry.getExamplesList();
    this.metaSubscription = this.metaService.getMeta()
      .pipe(
        map((comps: MetaComponent[]) =>
          comps.filter(comp =>
            availableExamples.includes(comp.component) &&
            !BLACKLIST.includes(comp.component))),
      )
      .subscribe(async (components: MetaComponent[]) => {
        await asyncForEach(components, async (componentMeta: MetaComponent) => {
          // if (componentMeta.name !== 'DtAlert') { return }
          if (componentMeta.members.length) {
            // generate mutations of the variants
            const mutations = mutateVariants(componentMeta, this.currentTheme);

            await asyncForEach(mutations, async (member: Variant) => {
              await this.applyChange(componentMeta, member, components);
            });
          } else {
            // if there are no variants from the parser instance it with the defaults
            const variant = { name: `${componentMeta.component}/${this.currentTheme}/default`, changes: [] };
            await this.applyChange(componentMeta, variant, components);
          }
        });

        console.log('ANGULAR: end of subscription!');
        if (window.sketchGenerator) {
          console.log('ANGULAR: emit finish');
          await window.sketchGenerator.emitFinish();
        }
      });
  }

  ngOnDestroy(): void {
    console.log('ANGULAR: ngOnDestroy!');
    this.metaSubscription.unsubscribe();
  }

  private async applyChange(componentMeta: MetaComponent, variant: Variant, components: MetaComponent[]) {
    const exampleType = this.registry.getExampleByName(componentMeta.component);
    if (!exampleType) {
      return;
    }

    const exampleComponentRef = this.instanceComponent(exampleType);
    const componentInstances = getComponentInstances(componentMeta.selector, exampleComponentRef);

    exampleComponentRef.changeDetectorRef.detectChanges();

    await asyncForEach(variant.changes, async (change: VariantChange) => {
      if (change.type === 'property') {
        await asyncForEach(componentInstances, async (instance) => {
          const value = (change.value === 'undefined') ? undefined : JSON.parse(change.value);
          const oldValue = instance[change.key];
          instance[change.key] = value;
          if (instance.ngOnChanges) {
            instance.ngOnChanges({
              [change.key]: new SimpleChange(oldValue, value, false),
            });
          }
          // if (window.sketchGenerator) {
          //   const el = instance._elementRef.nativeElement as HTMLElement;
          //   const selector = `${el.tagName}[class="${el.getAttribute('class')}"]`;
          //   await window.sketchGenerator.emitClick(selector);
          // }
        });
      }
    });

    exampleComponentRef.changeDetectorRef.detectChanges();

    // detect child angular components and annotate the variant in the tree
    const view = (exampleComponentRef.hostView as any)._view.nodes[0].componentView as ViewData;

    // wait for browser draw
    await waitForDraw();

    // has to be after wait for draw in case that components can be loaded later
    checkSubComponents(view, components, componentMeta, this.currentTheme);

    if (window.sketchGenerator) {
      await window.sketchGenerator.emitDraw(variant.name);
    }
  }

  private instanceComponent<C>(exampleType: Type<C>) {
    if (this.portalOutlet.hasAttached()) {
      this.portalOutlet.detach();
    }
    const portal = new ComponentPortal(exampleType, this.viewContainerRef);
    return this.portalOutlet.attachComponentPortal(portal);
  }
}

function getComponentInstances<C>(selectors: string[], exampleComponentRef: ComponentRef<C>) {
  const componentInstances = [];
  selectors.forEach((selector: string) => {
    const exampleElement = exampleComponentRef.location.nativeElement.querySelector(selector);
    const compInstance = findComponentInstance(exampleComponentRef, exampleElement);
    if (compInstance) {
      componentInstances.push(compInstance);
    }
  });

  return componentInstances;
}
