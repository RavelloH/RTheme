import { ImageResponse } from 'next/og';
import config from '../../config';

export function generateImageMetadata() {
    return [
        {
            contentType: 'image/png',
            size: { width: 16, height: 16 },
            id: '16x',
        },
        {
            contentType: 'image/png',
            size: { width: 32, height: 32 },
            id: '32x',
        },
        {
            contentType: 'image/png',
            size: { width: 36, height: 36 },
            id: '36x',
        },
        {
            contentType: 'image/png',
            size: { width: 48, height: 48 },
            id: '48x',
        },
        {
            contentType: 'image/png',
            size: { width: 72, height: 72 },
            id: '72x',
        },
        {
            contentType: 'image/png',
            size: { width: 96, height: 96 },
            id: '96x',
        },
        {
            contentType: 'image/png',
            size: { width: 128, height: 128 },
            id: '128x',
        },
        {
            contentType: 'image/png',
            size: { width: 144, height: 144 },
            id: '144x',
        },
        {
            contentType: 'image/png',
            size: { width: 192, height: 192 },
            id: '192x',
        },
        {
            contentType: 'image/png',
            size: { width: 256, height: 256 },
            id: '256x',
        },
        {
            contentType: 'image/png',
            size: { width: 384, height: 384 },
            id: '384x',
        },
        {
            contentType: 'image/png',
            size: { width: 512, height: 512 },
            id: '512x',
        },
        {
            contentType: 'image/png',
            size: { width: 1024, height: 1024 },
            id: '1024x',
        },
    ];
}

export default async function Icon({ id }) {
    return new ImageResponse(
        (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.siteURL + config.iconImage} width='100%' height='100%' alt='Icon' />
        ),
        {
            width: id.replace('x', ''),
            height: id.replace('x', ''),
        },
    );
}
