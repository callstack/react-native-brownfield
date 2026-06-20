import { Alert } from 'react-native';
import { setBrownfieldE2EMode, userAlert } from '../userAlert';

export function runUserAlertSuite(appLabel: string) {
  describe(`userAlert - ${appLabel}`, () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    afterEach(() => {
      setBrownfieldE2EMode(false);
      alertSpy.mockClear();
      logSpy.mockClear();
    });

    afterAll(() => {
      alertSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('shows a native alert outside E2E mode', () => {
      userAlert('No update available');
      expect(alertSpy).toHaveBeenCalledWith('No update available');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('logs to console in E2E mode', () => {
      setBrownfieldE2EMode(true);
      userAlert('Update check failed', 'network error');
      expect(alertSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        '[userAlert] Update check failed: network error'
      );
    });
  });
}
