import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

type FacialRecognitionNavigationProp = StackNavigationProp<RootStackParamList, 'FacialRecognition'>;

const FacialRecognition: React.FC = () => {
  const navigation = useNavigation<FacialRecognitionNavigationProp>();
  const { user } = useAuth();
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;



  useEffect(() => {
    // Animate content entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate scanning line
    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Animate pulse
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    scanAnimation.start();
    pulseAnimation.start();

    return () => {
      scanAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);





  const processFacialRecognition = async (imageUri?: string) => {
    const finalFaceImage = imageUri || faceImage;
    
    console.log('ProcessFacialRecognition called with:', {
      faceImage: finalFaceImage ? 'exists' : 'null',
      userId: user?.uid || 'null',
      user: user ? 'exists' : 'null'
    });
    
    if (!finalFaceImage || !user?.uid) {
      console.log('Validation failed:', { faceImage: !!finalFaceImage, userId: !!user?.uid });
      Alert.alert('Error', 'No image captured or user not found.');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Upload face image to Supabase Storage
      const fileName = `${user.uid}/face_${Date.now()}.jpg`;
      // Read image file using FileSystem
      const faceImageBase64 = await FileSystem.readAsStringAsync(finalFaceImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Face image base64 length:', faceImageBase64.length);
      
      // Convert base64 to binary data
      const binaryString = atob(faceImageBase64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading face image:', uploadError);
        throw new Error('Failed to upload face image');
      }

      // Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      const faceImageUrl = urlData.publicUrl;

      // Update KYC table with face image URL
      const { error: updateError } = await supabase
        .from('kyc')
        .update({
          face_image_url: faceImageUrl,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('uid', user.uid);

      if (updateError) {
        console.error('Error updating KYC record:', updateError);
        throw new Error('Failed to update KYC record');
      }

      // Simulate facial recognition processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Facial Recognition Complete!',
        'Your face has been successfully captured and submitted for verification. This process typically takes 12-24 hours.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('AccountSettings'),
          },
        ]
      );
    } catch (error) {
      console.error('Error processing facial recognition:', error);
      Alert.alert('Error', 'Failed to process facial recognition. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Face image captured:', imageUri.substring(0, 50) + '...');
        setFaceImage(imageUri);
        await processFacialRecognition(imageUri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const retakePhoto = () => {
    setFaceImage(null);
  };





  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facial Recognition</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
          <View style={styles.stepHeader}>
            <Ionicons name="person" size={48} color="#09d2fe" />
            <Text style={styles.stepTitle}>Facial Recognition</Text>
            <Text style={styles.stepSubtitle}>Capture a clear photo of your face for verification</Text>
          </View>

          {faceImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: faceImage }} style={styles.previewImage} />
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadArea}>
              <Ionicons name="person" size={64} color="#666666" />
              <Text style={styles.uploadText}>No face image captured yet</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={openCamera}>
              <Ionicons name="camera" size={24} color="#ffffff" />
              <Text style={styles.captureButtonText}>Capture Live Photo</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <Animated.View style={[styles.processingIcon, { transform: [{ rotate: scanAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }) }] }]}>
                <Ionicons name="sync" size={32} color="#09d2fe" />
              </Animated.View>
              <Text style={styles.processingText}>Processing facial recognition...</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Guidelines */}
      <View style={styles.guidelinesContainer}>
        <Text style={styles.guidelinesTitle}>Important Guidelines</Text>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.guidelineItemText}>Ensure good lighting on your face</Text>
        </View>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.guidelineItemText}>Look directly at the camera</Text>
        </View>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.guidelineItemText}>Remove glasses and hats if possible</Text>
        </View>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.guidelineItemText}>Keep your face centered in the frame</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#09d2fe',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  placeholder: {
    width: 40,
  },

  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#09d2fe',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#09d2fe',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 16,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retakeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  uploadArea: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'center',
  },
  uploadText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09d2fe',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#09d2fe',
  },
  galleryButtonText: {
    color: '#09d2fe',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  processingIcon: {
    marginBottom: 12,
  },
  processingText: {
    color: '#09d2fe',
    fontSize: 16,
    fontWeight: '500',
  },
  guidelinesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  guidelinesTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guidelineItemText: {
    color: '#94a3b8',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default FacialRecognition; 