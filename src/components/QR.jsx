import { QRCodeSVG } from 'qrcode.react';

export default function QR({ url }) {
    return (
        <div className='qr-container'>
            <QRCodeSVG value={url} size={256} level='L' includeMargin={true} className='qr-code' />
        </div>
    );
}
