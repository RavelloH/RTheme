export default function shuffler(text) {
    let insert = process.env.BUFFER;
    let result = '';
    let insertIndex = 0;
    for (let i = 0; i < text.length; i++) {
        result += text[i] + insert[insertIndex];
        insertIndex = (insertIndex + 1) % insert.length;
    }
    return result + process.env.PEPPER;
}
