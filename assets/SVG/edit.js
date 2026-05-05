import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const SvgComponent = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={800}
    height={800}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <Path
      fill="#2c2c2c"
      fillRule="evenodd"
      d="m18.94 3.12 2.122 2.122a3 3 0 0 1 0 4.243l-1.803 1.803-6.364-6.364 1.803-1.803a3 3 0 0 1 4.242 0Zm-7.106 2.865-8.127 8.127a3 3 0 0 0-.861 1.797l-.394 3.617a2 2 0 0 0 2.204 2.205l3.618-.394a3 3 0 0 0 1.796-.86l8.128-8.128-6.364-6.364Z"
      clipRule="evenodd"
    />
  </Svg>
);
export default SvgComponent;
