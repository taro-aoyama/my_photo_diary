import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from './themed-text';

// Mock the useThemeColor hook
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn().mockReturnValue('black'),
}));

describe('ThemedText', () => {
  it('renders correctly with default props', () => {
    const { getByText } = render(<ThemedText>Hello</ThemedText>);
    const textElement = getByText('Hello');
    expect(textElement).toBeTruthy();
  });

  it('applies the correct style for a given type', () => {
    const { getByText } = render(<ThemedText type="title">Title</ThemedText>);
    const textElement = getByText('Title');
    expect(textElement.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 32,
      })
    ]));
  });
});
