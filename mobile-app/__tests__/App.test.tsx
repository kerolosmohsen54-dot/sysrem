import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { LoginScreen } from '../src/screens/LoginScreen';

jest.mock('../src/auth/AuthContext', () => ({ useAuth: () => ({ login: jest.fn() }) }));

test('renders the ERP login heading and username field', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<LoginScreen />);
  });
  expect(renderer!.root.findByProps({ accessibilityLabel: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645' })).toBeTruthy();
  expect(renderer!.root.findByProps({ accessibilityLabel: 'اسم المستخدم' })).toBeTruthy();
});