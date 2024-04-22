import { Model } from "mongoose";
import User from "../resources/users/interface";
import logger from "./logger";

const getOne =
  (model: Model<any, {}, {}>) =>
  async (props: any, populate_opts: any = "") => {
    logger.info(`Fetching ${model.modelName} with id: ${props._id}`);
    return await model.findOne(props).populate(populate_opts).lean().exec();
  };

const getAll =
  (model: Model<any, {}, {}>) =>
  async (props: any, populate_opts: any = "") => {
    logger.info(`Fetching all ${model.modelName} with props: ${props}`);
    return await model
      .find(props)
      .sort({ updated_at: -1 })
      .populate(populate_opts)
      .lean()
      .exec();
  };

const getAllSecured =
  (model: Model<User, {}, {}>) =>
  async (props: any, args: any = "") => {
    logger.info(`Fetching all securely`);
    return await model
      .find(props, "-password")
      .sort({ updated_at: -1 })
      .populate(args)
      .lean()
      .exec();
  };

const createWithTransaction =
  (model: Model<any, {}, {}>) => async (props: any, SESSION: any) => {
    logger.info(`Creating ${model.modelName} with transaction`);
    return await model.create([props], { session: SESSION });
  };

const createOne = (model: Model<any, {}, {}>) => async (props: any) => {
  logger.info(`Creating ${model.modelName}`);
  return await model.create(props);
};

const updateWithTransaction =
  (model: Model<any, {}, {}>) =>
  async (props: any, id: String, SESSION: any) => {
    logger.info(`Updating ${model.modelName} with id(ACID): ${id}`);

    const payload = props;
    return await model.findOneAndUpdate({ _id: id }, payload, {
      new: true,
      session: SESSION,
    });
  };

const updateOne =
  (model: Model<any, {}, {}>) => async (props: any, id: String) => {
    logger.info(`Updating ${model.modelName} with id: ${id}`);

    const payload = props;
    return await model
      .findOneAndUpdate({ _id: id }, payload, { new: true })
      .exec();
  };

const deleteOne =
  (model: Model<any, {}, {}>) =>
  async (id: any, permanentDelete: Boolean, props?: Object) => {
    logger.info(`Deleting ${model.modelName} with id: ${id}`);
    if (permanentDelete == true) {
      if (typeof props == "undefined") props = { _id: id };

      return await model.deleteOne(props);
    }
    logger.info(`Soft deleting ${model.modelName} with id: ${id}`);
    return await model.updateOne(
      {
        _id: id,
      },
      { $set: { is_active: false } }
    );
  };

const getAllPopulated =
  (model: Model<any, {}, {}>) =>
  async (
    props: any,
    args1: any = "",
    args2: any = "",
    args3: any = "",
    args4: any = ""
  ) => {
    logger.info(`Fetching all ${model.modelName} with props: ${props}`);
    requestedTests: return await model
      .find(props)
      .sort({ updated_at: -1 })
      .populate(args1)
      .populate(args2)
      .populate(args3)
      .populate(args4)
      .exec();
  };

const getOnePopulated =
  (model: Model<any, {}, {}>) =>
  async (
    props: any,
    args1: any = "",
    args2: any = "",
    args3: any = "",
    args4: any = ""
  ) => {
    logger.info(`Fetching all ${model.modelName} with props: ${props}`);
    requestedTests: return await model
      .findOne(props)
      .populate(args1)
      .populate(args2)
      .populate(args3)
      .populate(args4)
      .exec();
  };

const aggregatedQuery =
  (model: Model<any, {}, {}>) => async (pipeline: any) => {
    logger.info(`Fetching all ${model.modelName} with props: ${pipeline}`);
    return await model.aggregate(pipeline).exec();
  };

const dataAccessLayer = (model: Model<any, {}, {}>) => ({
  updateOne: updateOne(model),
  getMany: getAll(model),
  getOne: getOne(model),
  createOne: createOne(model),
  deleteOne: deleteOne(model),
  getAllSecured: getAllSecured(model),
  createWithTransaction: createWithTransaction(model),
  updateWithTransaction: updateWithTransaction(model),
  getAllPopulated: getAllPopulated(model),
  getOnePopulated: getOnePopulated(model),
  aggregatedQuery: aggregatedQuery(model),
  getAll: getAll(model),
});

export default dataAccessLayer;
