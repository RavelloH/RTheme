export default function ConfirmList({ yesCallback, noCallback }) {
    return (
        <ul>
            <li>
                <a onClick={yesCallback} aria-label='confirm' data-umami-event='cofirmlist-yes'>
                    <span className='i ri-check-fill'></span>
                </a>
            </li>
            <li>
                <a onClick={noCallback} aria-label='cancel' data-umami-event='cofirmlist-no'>
                    <span className='i ri-close-fill'></span>
                </a>
            </li>
        </ul>
    );
}
