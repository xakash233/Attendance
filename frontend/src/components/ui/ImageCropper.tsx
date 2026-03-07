import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw } from 'lucide-react';
import getCroppedImg from '@/utils/cropImage';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: string) => void;
    onCancel: () => void;
    aspect?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    image,
    onCropComplete,
    onCancel,
    aspect = 1
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleCrop = async () => {
        try {
            if (croppedAreaPixels) {
                const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white max-w-xl w-full rounded-2xl shadow-xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-[#E6E8EC]">
                {/* Header */}
                <div className="p-6 border-b border-[#E6E8EC] flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-[18px] font-semibold text-[#101828] leading-none">Adjust Photo</h2>
                        <p className="text-[13px] font-medium text-[#667085] mt-1">Configure image zoom and orientation.</p>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-slate-100 hover:text-[#101828] transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Cropper Area */}
                <div className="flex-1 relative bg-white min-h-[40vh]">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        rotation={rotation}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteInternal}
                        onZoomChange={onZoomChange}
                        classes={{
                            containerClassName: 'bg-white',
                        }}
                    />
                </div>

                {/* Controls & Footer */}
                <div className="bg-white">
                    <div className="p-6 space-y-6 border-t border-[#E6E8EC]">
                        <div className="max-w-md mx-auto space-y-4">
                            {/* Zoom Slider */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-black text-[#667085] uppercase tracking-widest">Zoom Level</label>
                                    <span className="text-[11px] font-bold text-[#101828]">{Math.round(zoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => onZoomChange(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#101828]"
                                />
                            </div>

                            {/* Rotation Slider */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-black text-[#667085] uppercase tracking-widest">Rotation</label>
                                        <button onClick={() => setRotation(0)} className="text-[#667085] hover:text-[#101828] transition-colors">
                                            <RotateCcw size={12} />
                                        </button>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#101828]">{rotation}°</span>
                                </div>
                                <input
                                    type="range"
                                    value={rotation}
                                    min={0}
                                    max={360}
                                    step={1}
                                    aria-labelledby="Rotation"
                                    onChange={(e) => setRotation(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#101828]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-[#E6E8EC] flex justify-end gap-3">
                        <button onClick={onCancel} className="btn-secondary">
                            Cancel
                        </button>
                        <button onClick={handleCrop} className="btn-primary min-w-[120px]">
                            Apply Crop
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
