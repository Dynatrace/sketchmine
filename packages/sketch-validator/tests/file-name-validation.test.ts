import { filenameValidation, RULE_NAME } from '../src/rules/file-name-validation';
import { FileNameError } from '../src/error/validation-error';
import { ErrorHandler } from '../src/error/error-handler';

describe('Filename Validation', () => {

  beforeEach(() => (ErrorHandler as any).instance.destroy());

  test('should check if validation passes if filename is invalid', () => {
    const path = '/myprojects/projectname/projectname-feature-detail.sketch';
    filenameValidation(path);
    const val = (ErrorHandler as any).instance._rulesStack[RULE_NAME];
    expect(val.succeeding).toBeTruthy();
  });

  test('should check if ci360 (numbers) are valid in folder and file name', () => {
    const path = '/ci360/ci360-account.sketch';
    filenameValidation(path);
    const val = (ErrorHandler as any).instance._rulesStack[RULE_NAME];
    expect(val.succeeding).toBeTruthy();
  });

  test('should check if validation fails if filename does not contain foldername', () => {
    const path = '/myprojects/projectname-feature-detail.sketch';
    filenameValidation(path);
    const val = (ErrorHandler as any).instance._rulesStack[RULE_NAME];
    expect(val.succeeding).toBeFalsy();
    expect(val.failing[0]).toBeInstanceOf(FileNameError);

    expect(val.failing).toBeInstanceOf(Array);
    expect(val.failing).toHaveLength(1);
    expect(val.failing[0]).toBeInstanceOf(FileNameError);
  });

  test('should check if validation fails if filename contains invalid chars', () => {
    const path = '/myprojects/projectname_feature_detail2.sketch';
    filenameValidation(path);
    const val = (ErrorHandler as any).instance._rulesStack[RULE_NAME];
    expect(val.succeeding).toBeFalsy();
    expect(val.failing[0]).toBeInstanceOf(FileNameError);

    expect(val.failing).toBeInstanceOf(Array);
    expect(val.failing).toHaveLength(1);
    expect(val.failing[0]).toBeInstanceOf(FileNameError);
  });
});