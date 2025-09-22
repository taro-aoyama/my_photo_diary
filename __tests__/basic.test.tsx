import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text, Pressable, View } from 'react-native'

type Props = {
  onPress?: () => void
  label?: string
}

const TestComponent: React.FC<Props> = ({ onPress, label = 'Press me' }) => {
  return (
    <View>
      <Text accessibilityRole="header">Basic Test</Text>
      <Pressable testID="pressable" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    </View>
  )
}

describe('basic sample test', () => {
  it('renders the component and responds to presses', () => {
    const onPress = jest.fn()
    const { getByText, getByTestId } = render(
      <TestComponent onPress={onPress} label="Press me" />,
    )

    // The label should be rendered
    expect(getByText('Press me')).toBeTruthy()

    // Pressing the button should call the handler
    const pressable = getByTestId('pressable')
    fireEvent.press(pressable)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('renders default label when none is provided', () => {
    const { getByText } = render(<TestComponent />)

    expect(getByText('Press me')).toBeTruthy()
  })
})
