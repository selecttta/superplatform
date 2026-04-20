import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_DIM = 1200; // Max width/height after compression

/**
 * Compress image using canvas
 */
function compressImage(file, maxDim = MAX_DIM, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
                const ratio = Math.min(maxDim / width, maxDim / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    resolve(blob);
                },
                'image/webp',
                quality
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        img.src = url;
    });
}

export function useImageUpload() {
    const { user } = useAuthStore();
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    /**
     * Upload a single file to Supabase Storage
     * @param {File} file
     * @param {string} bucket - 'avatars' | 'listings' | 'products' | 'documents'
     * @param {string} [folder] - optional subfolder
     * @returns {Promise<string|null>} public URL or null
     */
    const upload = useCallback(async (file, bucket = 'listings', folder = '') => {
        if (!user) { toast.error('Please sign in'); return null; }

        // Validate
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Only JPEG, PNG, WebP and GIF images are allowed');
            return null;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error('Image must be under 5MB');
            return null;
        }

        setUploading(true);
        setProgress(10);

        try {
            // Compress
            setProgress(30);
            const compressed = await compressImage(file);

            // Generate unique path
            const ext = 'webp';
            const timestamp = Date.now();
            const rand = Math.random().toString(36).slice(2, 8);
            const path = folder
                ? `${folder}/${user.id}/${timestamp}-${rand}.${ext}`
                : `${user.id}/${timestamp}-${rand}.${ext}`;

            setProgress(50);

            // Upload
            const { error } = await supabase.storage
                .from(bucket)
                .upload(path, compressed, {
                    contentType: 'image/webp',
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) throw error;

            setProgress(90);

            // Get public URL
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            setProgress(100);

            return urlData?.publicUrl || null;
        } catch (err) {
            toast.error(err.message || 'Upload failed');
            return null;
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 500);
        }
    }, [user]);

    /**
     * Upload multiple files
     * @param {File[]} files
     * @param {string} bucket
     * @param {string} [folder]
     * @returns {Promise<string[]>} array of public URLs
     */
    const uploadMultiple = useCallback(async (files, bucket = 'listings', folder = '') => {
        const urls = [];
        for (const file of files) {
            const url = await upload(file, bucket, folder);
            if (url) urls.push(url);
        }
        return urls;
    }, [upload]);

    return { upload, uploadMultiple, uploading, progress };
}
