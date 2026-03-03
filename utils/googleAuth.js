import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// ✅ Module load hote hi configure ho jata hai — useEffect ka wait nahi
GoogleSignin.configure({
  // ✅ Same project jahan Cognito configured hai
  webClientId:
    '236630957782-3bcls107c8qeth7cbuj3a861rdsgrj5a.apps.googleusercontent.com',
  offlineAccess: true,
});

export const configureGoogleSignIn = () => {
  // Keep this for backward compat but configure already done above
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const userInfo = await GoogleSignin.signIn();

    return {
      success: true,
      idToken: userInfo.data?.idToken,
      user: userInfo.data?.user,
    };
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign in cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign in already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Play services not available' };
    } else {
      console.log('Google Sign-In Error:', error);
      return { success: false, error: error.message };
    }
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
