//--> save registraion progess
//--> get registration process
// need dep react-native aysnc storage

import AsyncStorage from '@react-native-async-storage/async-storage';

//--> install dep aynscstorage
export const saveRegistrationProgress = async (screenName, data) => {
  try {
    const key = `registration_progress_${screenName}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`progress saved for the screenName ${screenName}`);
  } catch (error) {
    console.log('Error saving the progress', error);
  }
};

export const getRegistrationProgress = async screenName => {
  try {
    const key = `registration_progress_${screenName}`;
    const data = await AsyncStorage.getItem(key);
    return data !== null ? JSON.parse(data) : null;
  } catch (error) {
    console.log('error retrieving the progress');
  }
};
//--- now implement this function in each screen for data storing in each screen -- go to navigation part using focuseffect
