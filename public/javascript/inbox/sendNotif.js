let recipients = document.getElementById('recipients');
let recipient_list = document.getElementById('recipient_list');

recipients.onchange = () => {
    let x = recipients.value;
    if (recipient_list.value == '') {
        recipient_list.value += `${x}`;
    } else {
        recipient_list.value += `, ${x}`;
    }
}
