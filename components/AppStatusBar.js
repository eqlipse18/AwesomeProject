import React from 'react';
import { StatusBar } from 'react-native';

const AppStatusBar = ({
  style = 'light-content',
  hidden = false,
  animated = true,
  transition = 'fade',
}) => {
  return (
    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle={style}
      hidden={hidden}
      animated={animated}
      showHideTransition={transition}
    />
  );
};

export default AppStatusBar;
