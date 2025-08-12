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
  ScrollView,
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

type KYCSubmissionNavigationProp = StackNavigationProp<RootStackParamList, 'KYCSubmission'>;

const KYCSubmission: React.FC = () => {
  const navigation = useNavigation<KYCSubmissionNavigationProp>();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'front' | 'back' | 'submitting'>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;



  useEffect(() => {
    // Animate progress bar based on current step
    const progressValue = currentStep === 'front' ? 0.33 : currentStep === 'back' ? 0.66 : 1;
    Animated.timing(progressAnim, {
      toValue: progressValue,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Animate content entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);



  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (currentStep === 'front') {
          setFrontImage(imageUri);
          setCurrentStep('back');
        } else if (currentStep === 'back') {
          setBackImage(imageUri);
          setCurrentStep('submitting');
          await submitKYC(imageUri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const submitKYC = async (backImageUri?: string) => {
    const finalBackImage = backImageUri || backImage;
    
    console.log('SubmitKYC called with:', {
      frontImage: frontImage ? 'exists' : 'null',
      finalBackImage: finalBackImage ? 'exists' : 'null',
      userId: user?.uid || 'null'
    });
    
    if (!frontImage || !finalBackImage || !user?.uid) {
      console.log('Validation failed:', { frontImage: !!frontImage, finalBackImage: !!finalBackImage, userId: !!user?.uid });
      Alert.alert('Error', 'Please capture both front and back images of your ID card.');
      return;
    }

    try {
      console.log('Starting KYC upload process...');
      
      // Upload front image to Supabase Storage
      const frontFileName = `${user.uid}/front_${Date.now()}.jpg`;
      console.log('Uploading front image:', frontFileName);
      
      // Upload image directly using base64
      console.log('Uploading front image as base64');
      
      // Read image file using FileSystem
      const frontImageBase64 = await FileSystem.readAsStringAsync(frontImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Front image base64 length:', frontImageBase64.length);
      
      // Convert base64 to binary data
      const frontBinaryString = atob(frontImageBase64);
      const frontArrayBuffer = new ArrayBuffer(frontBinaryString.length);
      const frontUint8Array = new Uint8Array(frontArrayBuffer);
      for (let i = 0; i < frontBinaryString.length; i++) {
        frontUint8Array[i] = frontBinaryString.charCodeAt(i);
      }
      
      const { data: frontUploadData, error: frontUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(frontFileName, frontArrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (frontUploadError) {
        console.error('Error uploading front image:', frontUploadError);
        throw new Error('Failed to upload front image');
      } else {
        console.log('Front image uploaded successfully');
      }

      // Upload back image to Supabase Storage
      const backFileName = `${user.uid}/back_${Date.now()}.jpg`;
      // Read image file using FileSystem
      const backImageBase64 = await FileSystem.readAsStringAsync(finalBackImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Back image base64 length:', backImageBase64.length);
      
      // Convert base64 to binary data
      const backBinaryString = atob(backImageBase64);
      const backArrayBuffer = new ArrayBuffer(backBinaryString.length);
      const backUint8Array = new Uint8Array(backArrayBuffer);
      for (let i = 0; i < backBinaryString.length; i++) {
        backUint8Array[i] = backBinaryString.charCodeAt(i);
      }
      
      const { data: backUploadData, error: backUploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(backFileName, backArrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (backUploadError) {
        console.error('Error uploading back image:', backUploadError);
        throw new Error('Failed to upload back image');
      } else {
        console.log('Back image uploaded successfully');
      }

      // Get the public URLs of the uploaded images
      const { data: frontUrlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(frontFileName);

      const { data: backUrlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(backFileName);

      const frontImageUrl = frontUrlData.publicUrl;
      const backImageUrl = backUrlData.publicUrl;

      // Update KYC table with image URLs
      const { error: updateError } = await supabase
        .from('kyc')
        .update({
          card_front_url: frontImageUrl,
          card_back_url: backImageUrl,
          status: 'pending',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('uid', user.uid);

      if (updateError) {
        console.error('Error updating KYC record:', updateError);
        throw new Error('Failed to update KYC record');
      } else {
        console.log('KYC record updated successfully');
      }

      console.log('KYC submission completed successfully');
      Alert.alert(
        'KYC Submitted Successfully!',
        'Your documents have been submitted for review. This process typically takes 12-24 hours.',
        [
          {
            text: 'Continue to Facial Recognition',
            onPress: () => navigation.navigate('FacialRecognition'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting KYC:', error);
      Alert.alert('Error', 'Failed to submit KYC. Please try again.');
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('Image captured:', { currentStep, imageUri: imageUri.substring(0, 50) + '...' });
        
        if (currentStep === 'front') {
          console.log('Setting front image and moving to back step');
          setFrontImage(imageUri);
          setCurrentStep('back');
        } else if (currentStep === 'back') {
          console.log('Setting back image and submitting KYC');
          setBackImage(imageUri);
          setCurrentStep('submitting');
          await submitKYC(imageUri);
        }
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const retakePhoto = () => {
    if (currentStep === 'front') {
      setFrontImage(null);
    } else if (currentStep === 'back') {
      setBackImage(null);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              })}
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep === 'front' ? '1' : currentStep === 'back' ? '2' : '3'} of 3
        </Text>
      </View>

      {/* Content with ScrollView */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 'front' && (
          <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.stepHeader}>
              <Ionicons name="card" size={48} color="#09d2fe" />
              <Text style={styles.stepTitle}>ID Card Front</Text>
              <Text style={styles.stepSubtitle}>Capture the front of your government-issued ID</Text>
            </View>

            {frontImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: frontImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                  <Ionicons name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadArea}>
                <Ionicons name="camera" size={64} color="#666666" />
                <Text style={styles.uploadText}>No image captured yet</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.captureButton} onPress={openCamera}>
                <Ionicons name="camera" size={24} color="#ffffff" />
                <Text style={styles.captureButtonText}>Capture Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color="#09d2fe" />
                <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {currentStep === 'back' && (
          <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.stepHeader}>
              <Ionicons name="card" size={48} color="#09d2fe" />
              <Text style={styles.stepTitle}>ID Card Back</Text>
              <Text style={styles.stepSubtitle}>Capture the back of your government-issued ID</Text>
            </View>

            {backImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: backImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.retakeButton} onPress={() => setBackImage(null)}>
                  <Ionicons name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadArea}>
                <Ionicons name="camera" size={64} color="#666666" />
                <Text style={styles.uploadText}>No image captured yet</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.captureButton} onPress={openCamera}>
                <Ionicons name="camera" size={24} color="#ffffff" />
                <Text style={styles.captureButtonText}>Capture Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                <Ionicons name="images" size={24} color="#09d2fe" />
                <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {currentStep === 'submitting' && (
          <View style={styles.submittingContainer}>
            <View style={styles.submittingContent}>
              <Animated.View style={[styles.submittingIcon, { transform: [{ rotate: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }) }] }]}>
                <Ionicons name="checkmark-circle" size={64} color="#10b981" />
              </Animated.View>
              <Text style={styles.submittingTitle}>Submitting KYC Documents</Text>
              <Text style={styles.submittingText}>Please wait while we process your documents...</Text>
            </View>
          </View>
        )}

        {/* Guidelines - Now part of scrollable content */}
        {currentStep !== 'submitting' && (
          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>Important Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.guidelineItemText}>Ensure all text is clearly visible and readable</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.guidelineItemText}>Avoid glare and shadows on the document</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.guidelineItemText}>Make sure the entire document is within the frame</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.guidelineItemText}>Use a government-issued ID (CNIC, Passport, etc.)</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  cameraFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.8,
    height: height * 0.3,
    marginLeft: -(width * 0.4),
    marginTop: -(height * 0.15),
    borderWidth: 2,
    borderColor: '#09d2fe',
    borderRadius: 12,
  },
  frameCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#09d2fe',
    borderWidth: 3,
  },
  guidelines: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
  },
  guidelineText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 8,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#09d2fe',
    borderRadius: 2,
  },
  progressText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    justifyContent: 'center',
    minHeight: height * 0.6, // Ensure minimum height for content
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
    width: Math.min(width * 0.8, 320),
    height: Math.min(height * 0.25, 200),
    borderRadius: 12,
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
    width: Math.min(width * 0.8, 320),
    height: Math.min(height * 0.25, 200),
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'center',
  },
  uploadText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 30, // Add space before guidelines
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
  submittingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: height * 0.6,
    paddingVertical: 40,
  },
  submittingContent: {
    alignItems: 'center',
  },
  submittingIcon: {
    marginBottom: 20,
  },
  submittingTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  submittingText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  guidelinesContainer: {
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#333333',
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

export default KYCSubmission; 