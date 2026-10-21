const assert = require('node:assert/strict');
const test = require('node:test');

const {
  pickIosSimulatorDeviceType,
} = require('./detox-ios-simulator-device.cjs');

test('prefers an installed simulator over a newer uncreated device type', () => {
  assert.equal(
    pickIosSimulatorDeviceType({
      deviceTypes: ['iPhone 16', 'iPhone 17 Pro Max'],
      availableDevices: ['iPhone 16'],
    }),
    'iPhone 16'
  );
});

test('falls back to available device types when no simulators are installed', () => {
  assert.equal(
    pickIosSimulatorDeviceType({
      deviceTypes: ['iPhone 16', 'iPhone 17 Pro'],
      availableDevices: [],
    }),
    'iPhone 17 Pro'
  );
});

test('uses the default fallback when simctl returns no iPhone data', () => {
  assert.equal(
    pickIosSimulatorDeviceType({
      deviceTypes: [],
      availableDevices: [],
    }),
    'iPhone 16'
  );
});
