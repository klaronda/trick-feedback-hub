import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import Cropper from 'react-easy-crop';

interface CropPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: File | null;
  onCropComplete: (croppedImage: File) => void;
}

export function CropPhotoModal({ isOpen, onClose, image, onCropComplete }: CropPhotoModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [image]);

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          resolve(file);
        }
      }, 'image/jpeg', 0.8);
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageUrl) return;
    
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl text-primary-foreground font-semibold">Crop Photo</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cropper */}
        <div className="relative h-80 bg-gray-100">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Zoom Control */}
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}