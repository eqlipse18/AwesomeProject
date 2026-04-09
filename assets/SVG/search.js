import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const SearchIcon = ({ size = 22, color = '#1F2937', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    {/* soft background circle */}
    <Path
      fill={color}
      d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      opacity={0.06}
    />

    {/* handle */}
    <Path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="m15 15 5 5"
    />

    {/* main circle */}
    <Path
      stroke={color}
      strokeWidth={2}
      d="M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
    />
  </Svg>
);

export default SearchIcon;
