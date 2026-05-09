const express = require("express")
const router = express.Router()

module.exports = (boardController) => {
    router.post("/create", boardController.createBoardHandler.bind(boardController));
    router.get("/user-boards", boardController.getUserBoardsHandler.bind(boardController));
    router.delete("/delete/:id", boardController.deleteBoardHandler.bind(boardController));
    router.post("/:id/participant/:userId", boardController.addParticipantHandler.bind(boardController));
    router.patch("/:id/participant/:userId", boardController.updateParticipantAccessHandler.bind(boardController));
    router.put("/:id/participant/access", boardController.changeParticipantAccessHandler.bind(boardController));
    router.get("/:id/access", boardController.getUserAccessHandler.bind(boardController));
    router.get("/:id/active-participants", boardController.getActiveParticipantsHandler.bind(boardController));
    router.post("/:id/request-access", boardController.requestBoardAccessHandler.bind(boardController));
    
    return router;
};