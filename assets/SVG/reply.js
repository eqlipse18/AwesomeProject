import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
/* SVGR has dropped some elements not supported by react-native-svg: title */
const SvgComponent = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={800}
    height={800}
    viewBox="-0.5 0 28 28"
    {...props}
  >
    <Path
      fill="#2c2c2c"
      fillRule="evenodd"
      d="M11.983 7.01v-5.9a.992.992 0 0 0-.275-.83 1.025 1.025 0 0 0-1.434 0L.285 11.24a.98.98 0 0 0-.287.76c-.014.27.076.55.287.76l9.934 10.89c.371.32 1.052.5 1.489.06.227-.22.327-.42.292-.71v-6c6.6 0 12.569 4.75 13.754 11.01A15.003 15.003 0 0 0 27 22.02c0-8.29-6.724-15.01-15.017-15.01"
    />
  </Svg>
);
export default SvgComponent;
