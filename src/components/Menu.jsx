import config from '../../config';

let menuList = config.menu.map((item, index) => {
    if (item.name) {
        return (
            <li style={{ '--i': index + 1 }} key={index + 1}>
                <a href={item.href}>
                    <span className={'i_small ' + item.icon}></span> {item.name}
                </a>
            </li>
        );
    } else {
        return (
            <li style={{ '--i': index + 1 }} key={index + 1}>
                &nbsp;
            </li>
        );
    }
});

export default function Menu() {
    return <>{menuList}</>;
}
