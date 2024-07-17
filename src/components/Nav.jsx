import config from '../../config';

let navList = config.nav.map((item, index) => {
    return (
        <a
            key={index + 1}
            href={config.remotePath + item.link}
            className='loading'
            style={{ '--i': config.nav.length - index }}
            id={item.id}
        >
            {item.name}
        </a>
    );
});

export default function Nav() {
    return <nav>{navList}</nav>;
}
