/**
 * This code was generated by v0 by Vercel.
 * @see https://v0.dev/t/E0KEHeSQKu7
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */

/** Add fonts into your Next.js project:

 import { Inter } from 'next/font/google'

 inter({
 subsets: ['latin'],
 display: 'swap',
 })

 To read more about using these font, please visit the Next.js documentation:
 - App Directory: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
 - Pages Directory: https://nextjs.org/docs/pages/building-your-application/optimizing/fonts
 **/
'use client';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/app/components/ui/card';
import {Progress} from '@/app/components/ui/progress';
import {Button} from '@/app/components/ui/button';
import React, {Reducer, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import axios from 'axios';
import {Input} from '@/app/components/ui/input';
import {useToast} from '@/app/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {ChevronDownIcon} from "@/app/components/icon/chevron-down-icon";
import {HtmlIcon} from "@/app/components/icon/html-icon";
import {MarkdownIcon} from "@/app/components/icon/markdown-icon";
import {BBCodeIcon} from "@/app/components/icon/bb-code-icon";
import {UrlIcon} from "@/app/components/icon/url-icon";
import {FileSelectZone, FileSelectZoneRef} from "@/app/components/file-select-zone";
import imageCompression from 'browser-image-compression';
import {sleep} from "@/app/lib/utils";

type ImgUploadStatus = 'idle' | 'selected' | 'compressing' |'uploading' | 'completed'
type ImgUploadState = {
  status: ImgUploadStatus;
  file: File | null;
  fileKey: string;
  progress: number;
}

type ImgUploadAction =
    | { type: 'idle' }
    | { type: 'selected'; file: File }
    | { type: 'compressing'; progress: number }
    | { type: 'uploading'; progress: number }
    | { type: 'completed'; fileKey: string }
    | { type: 'error'; error: string }

const uploadReducer: Reducer<ImgUploadState, ImgUploadAction> = (state, action) => {
  switch (action.type) {
    case 'idle':
      return { ...state, status: 'idle', file: null, fileKey: '', progress: 0 };
    case 'selected':
      return { ...state, status: 'selected', file: action.file, fileKey: '', progress: 0 };
    case 'compressing':
      return { ...state, status: 'compressing', progress: action.progress };
    case 'uploading':
      return { ...state, status: 'uploading', progress: action.progress };
    case 'completed':
      return { ...state, status: 'completed', fileKey: action.fileKey, progress: 100 };
    case 'error':
      return { ...state, status: 'selected', fileKey: '', progress: 0 };
  }
}

const initialState: ImgUploadState = { status: 'idle', file: null, fileKey: '', progress: 0 };

export interface ImgUploadProps {
  maxImageSize: number;
  enableImageCompression: boolean;
  compressedImageMaxSize: number;
  maxImageWidthOrHeight: number;
  webpServerUrl: string;
}

export function ImgUpload(
    {
      maxImageSize,
      enableImageCompression,
      compressedImageMaxSize,
      maxImageWidthOrHeight,
      webpServerUrl
    }: ImgUploadProps
) {
  const [{ status, file, fileKey, progress }, dispatch] = useReducer(uploadReducer, initialState);
  const [copyLink, setCopyLink] = useState('');
  const fileZoneRef = useRef<FileSelectZoneRef | null>(null);

  const { toast } = useToast();

  const filePath = fileKey && /file/ + fileKey;
  const fileUrl = filePath && new URL(filePath, webpServerUrl).href;

  const handleFileChange = useCallback((file: File) => {
    dispatch({ type: 'selected', file })
  }, []);

  const handleFileSelectError = useCallback((error: string) => {
    toast({
      variant: 'destructive',
      title: error,
    });
  }, [toast])

  // useEffect(() => {
  //   console.log('ImgUpload handleFileChange change')
  // }, [handleFileChange]);
  //
  // useEffect(() => {
  //   console.log('ImgUpload handleFileSelectError change')
  // }, [handleFileSelectError]);

  const handleCopyUrl = async () => {
    if (copyLink) {
      await navigator.clipboard.writeText(copyLink);
      toast({
        description: ' 🎉 Copied URL to clipboard.',
      });
    }
  };

  const openFileSelect = () => {
    fileZoneRef.current?.openFileSelect();
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected.',
      });
      return;
    }

    try {
      const formData = new FormData();

      if(enableImageCompression && file.size > compressedImageMaxSize) {
        dispatch({ type: 'compressing', progress: 0 });
        const options = {
          maxSizeMB: compressedImageMaxSize,
          maxWidthOrHeight: maxImageWidthOrHeight,
          useWebWorker: true,
          initialQuality: 0.8,
          alwaysKeepResolution: true,
          onProgress: (progress: number) => {
            dispatch({ type: 'compressing', progress: progress });
          }
        }
        const compressedFile = await imageCompression(file, options);
        await sleep(500); //暂停是为了显示进度条的完成状态，否则会感觉压缩没有完成
        const newFile = new File([compressedFile], file.name, { type: compressedFile.type });
        formData.append('file', newFile);
      } else {
        formData.append('file', file);
      }

      dispatch({ type: 'uploading', progress: 0 });

      const response = await axios.post('/api/upload', formData, {
        onUploadProgress: function(progressEvent) {
          if (progressEvent.lengthComputable && progressEvent.total) {
            const percentComplete = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
            dispatch({ type: 'uploading', progress: percentComplete });
          }
        },
      });

      const data = response.data;
      dispatch({ type: 'completed', fileKey: data.key });
      toast({
        description: ' 👏 Upload completed.',
      });
    } catch (e: any) {
      let error: string;
      if(typeof e === 'string') {
        error = e;
      } else {
        error = e.response?.data?.message || 'Upload failed.';
      }
      dispatch({ type: 'error', error })
      toast({
        variant: 'destructive',
        title: error,
      });
    }
  };

  const selectFileDisabled = status === 'uploading' || status === 'compressing';
  const sProgress = (status === 'uploading' && progress > 98) ? 98 : progress;

  function getButtonText(status: ImgUploadStatus) {
    switch (status) {
      case 'idle':
        return (
            <Button type="button" onClick={openFileSelect} className="w-full">
              Select Image
            </Button>
        );
      case 'selected':
        return (
            <Button type="button" onClick={handleUpload} className="w-full">
              Upload
            </Button>
        );
      case 'compressing':
        return (
            <Button type="button" disabled={true} className="w-full">
              Compressing...
            </Button>
        );
      case 'uploading':
        return (
            <Button type="button" variant='success' disabled={true} className="w-full">
              Uploading...
            </Button>
        );
      case 'completed':
        return (
            <Button type="button" variant='success' onClick={handleCopyUrl} className="w-full">
              ✨ Copy to Clipboard ✨
            </Button>
        );
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/*<div className="absolute inset-0 bg-gradient-to-r from-[#e0f2fe] to-[#bae6fd] opacity-20 blur-xl" />*/}
      <Card className="z-10 bg-white bg-opacity-40 rounded-none border-0 shadow-none sm:rounded-xl sm:border sm:shadow">
        <CardHeader>
          <CardTitle>Upload Images</CardTitle>
          <CardDescription>Select, drag and drop, or paste file for upload.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FileSelectZone
              ref={fileZoneRef}
              disabled={selectFileDisabled}
              onFileChange={handleFileChange}
              onError={handleFileSelectError}
              file={file}
              className="flex flex-col items-center justify-center h-[272px] border-2 border-dashed rounded-lg cursor-pointer"
              maxImageSize={maxImageSize}
          />
          <Progress key={status} indicatorClassName={status === 'compressing' ? 'bg-gray-500' : 'bg-green-700'} value={sProgress} />
          <LinkCopyBox link={fileUrl} filename={file?.name} onChange={setCopyLink} />
          {getButtonText(status)}
        </CardContent>
      </Card>
    </div>
  );
}

type LinkType = 'url' | 'html' | 'markdown' | 'bbCode'

function LinkCopyBox({ link, filename, onChange }: {
  link: string,
  filename?: string,
  onChange?: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<LinkType>('url');
  const [copyLink, setCopyLink] = useState(getLink(type, link, filename || 'image'));

  useEffect(() => {
    setCopyLink(getLink(type, link, filename || 'image'));
  }, [type, link, filename]);

  useEffect(() => {
    if (onChange) {
      onChange(copyLink);
    }
  }, [copyLink, onChange]);
  const handleInputFocus = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };
  const handleTypeChange = (value: LinkType) => {
    return () => {
      setType(value);
    };
  };

  return (
    <div className="flex items-center gap-2">
      <Input type="text" disabled={!link} placeholder="Image URL" ref={inputRef} className="flex-1"
             onFocus={handleInputFocus} value={copyLink} readOnly />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline"
                  className={'pr-2 pl-3 bg-transparent text-muted-foreground focus-visible:ring-0 hover:bg-transparent'}>
            <CodeIcon type={type} className={'h-4 w-4 mr-1'} />
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleTypeChange('url')}>
            <UrlIcon className="h-4 w-4 mr-1.5" /> URL
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleTypeChange('markdown')}>
            <MarkdownIcon className="h-4 w-4 mr-1.5" /> Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleTypeChange('html')}>
            <HtmlIcon className="h-4 w-4 mr-1.5" /> HTML
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleTypeChange('bbCode')}>
            <BBCodeIcon className="h-4 w-4 mr-1.5" /> BBCode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getLink(type: LinkType, link: string, filename: string) {
  switch (type) {
    case 'url':
      return link;
    case 'html':
      return `<img src="${link}" alt="${filename}" />`;
    case 'bbCode':
      return `[img]${link}[/img]`;
    case'markdown':
      return `![${filename}](${link})`;
    default:
      return link;
  }
}

function CodeIcon({ type, className }: { type: LinkType, className?: string }) {
  switch (type) {
    case 'url':
      return <UrlIcon className={className} />;
    case 'html':
      return <HtmlIcon className={className} />;
    case 'bbCode':
      return <BBCodeIcon className={className} />;
    case'markdown':
      return <MarkdownIcon className={className} />;
    default:
      return <UrlIcon className={className} />;
  }
}

