class BoardRepository {
    async save(board) {
        throw new Error('Method save() must be implemented');
    }

    async findById(id) {
        throw new Error('Method findById() must be implemented');
    }

    async findByOwner(ownerId) {
        throw new Error('Method findByOwner() must be implemented');
    }

    async findByParticipant(userId) {
        throw new Error('Method findByParticipant() must be implemented');
    }

    async delete(id) {
        throw new Error('Method delete() must be implemented');
    }
}

module.exports = BoardRepository;
