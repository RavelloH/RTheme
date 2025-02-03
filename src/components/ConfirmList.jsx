export default function ConfirmList({ yesCallback, noCallback }) {
    return (
        <ul>
            <li>
                <a onClick={yesCallback} aria-label='confirm'>
                    <span className='i ri-check-fill'></span>
                </a>
            </li>
            <li>
                <a onClick={noCallback} aria-label='cancel'>
                    <span className='i ri-close-fill'></span>
                </a>
            </li>
        </ul>
    );
}
