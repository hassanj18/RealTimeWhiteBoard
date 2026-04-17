import { Request, Response } from "express";
import { CreatureModel } from "../../../outbound/persistence/mongodb/models/Creature";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export const addCreature = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  const { name, power } = req.body;
  console.log(name)
  const newCreature = await CreatureModel.create({ name, power, owner: userId });
  res.status(201).json(newCreature);
};
export const getCreatures = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  const creatures = await CreatureModel.find({ owner: userId }).exec();
  console.log(creatures);
  res.json(creatures);
};

export const deleteCreature = async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });
  const id = req.params.id;
  if (!id) throw new Error("Path parameter id is missing");
  const creature = await CreatureModel.findById(id).exec();
  if (!creature) return res.status(404).json({ error: "Creature not found" });
  if (String((creature as any).owner) !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }
  await CreatureModel.deleteOne({ _id: id }).exec();
  res.json({ message: "Creature deleted" });
};