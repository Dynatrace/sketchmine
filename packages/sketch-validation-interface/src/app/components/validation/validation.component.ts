import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import {
  ValidationService,
  CommunicationService,
  DocumentMetaResponseData,
  ColorService,
} from '../../services';
import { ValidationConfig } from '../../interfaces';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'validation',
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ValidationComponent implements OnDestroy {
  documentMeta: DocumentMetaResponseData;
  loading = true;
  result: any[];
  destroy$ = new Subject<void>();

  constructor(
    private colorService: ColorService,
    private communicationService: CommunicationService,
    private validationService: ValidationService,
    private changeDetectorRef: ChangeDetectorRef,
    private snackBar: MatSnackBar,
  ) {
    this.validationService.getRules();

    combineLatest(
      this.colorService.getColors(),
      this.communicationService.getDocumentMeta())
    .pipe(takeUntil(this.destroy$))
    .subscribe(([colors, docMeta]) => {
      if (colors && docMeta) {
        this.validationService.colorsFile = colors;
        this.documentMeta = docMeta;
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      } else {
        this.snackBar.open('🤖 grrrr! Could not load the Sketch document or colors!');
      }
    });
  }

  handleValidate(config: ValidationConfig) {
    this.loading = true;
    this.communicationService.getDocument()
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe((document) => {
        this.documentMeta = document;
        this.validationService.sketchDocument = document;
        this.result = this.validationService.validate(config);
        this.loading = false;
        this.changeDetectorRef.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
