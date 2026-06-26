const BOARD_ACTIONS_TOPIC = process.env.KAFKA_BOARD_ACTIONS_TOPIC || 'boards.actions';
const BOARD_INFO_TOPIC = process.env.KAFKA_BOARD_INFO_TOPIC || 'boards.info';

function topicForEventType(eventType) {
    if (eventType === 'BOARD_EVENT') {
        return BOARD_ACTIONS_TOPIC;
    }
    return BOARD_INFO_TOPIC;
}

module.exports = {
    BOARD_ACTIONS_TOPIC,
    BOARD_INFO_TOPIC,
    topicForEventType,
};
