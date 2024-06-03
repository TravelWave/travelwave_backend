import { Model } from "mongoose";
import _ from "lodash";
import User from "../resources/users/interface";
import logger from "./logger";

// Helper function to sanitize inputs
const sanitizeInput = (input: any) => {
  return _.omit(input, ["__proto__", "constructor", "prototype"]);
};

const getOne =
  (model: Model<any, {}, {}>) =>
  async (props: any, populate_opts: any = "") => {
    logger.info(`Fetching ${model.modelName} with id: ${props._id}`);
    const sanitizedProps = sanitizeInput(props);
    return await model
      .findOne(sanitizedProps)
      .populate(populate_opts)
      .lean()
      .exec();
  };

const getAll =
  (model: Model<any, {}, {}>) =>
  async (props: any, populate_opts: any = "") => {
    logger.info(`Fetching all ${model.modelName} with props: ${props}`);
    const sanitizedProps = sanitizeInput(props);
    return await model
      .find(sanitizedProps)
      .sort({ updated_at: -1 })
      .populate(populate_opts)
      .lean()
      .exec();
  };

const getAllSecured =
  (model: Model<User, {}, {}>) =>
  async (props: any, args: any = "") => {
    logger.info(`Fetching all securely`);
    const sanitizedProps = sanitizeInput(props);
    return await model
      .find(sanitizedProps, "-password")
      .sort({ updated_at: -1 })
      .populate(args)
      .lean()
      .exec();
  };

const createWithTransaction =
  (model: Model<any, {}, {}>) => async (props: any, SESSION: any) => {
    logger.info(`Creating ${model.modelName} with transaction`);
    const sanitizedProps = sanitizeInput(props);
    return await model.create([sanitizedProps], { session: SESSION });
  };

const createOne = (model: Model<any, {}, {}>) => async (props: any) => {
  logger.info(`Creating ${model.modelName}`);
  const sanitizedProps = sanitizeInput(props);
  return await model.create(sanitizedProps);
};

const updateWithTransaction =
  (model: Model<any, {}, {}>) =>
  async (props: any, id: String, SESSION: any) => {
    logger.info(`Updating ${model.modelName} with id(ACID): ${id}`);
    const sanitizedProps = sanitizeInput(props);
    return await model.findOneAndUpdate({ _id: id }, sanitizedProps, {
      new: true,
      session: SESSION,
    });
  };

const updateOne =
  (model: Model<any, {}, {}>) => async (props: any, id: String) => {
    logger.info(`Updating ${model.modelName} with id: ${id}`);
    const sanitizedProps = sanitizeInput(props);
    return await model
      .findOneAndUpdate({ _id: id }, sanitizedProps, { new: true })
      .exec();
  };

const deleteOne =
  (model: Model<any, {}, {}>) =>
  async (id: any, permanentDelete: Boolean, props?: Object) => {
    logger.info(`Deleting ${model.modelName} with id: ${id}`);
    const sanitizedProps = sanitizeInput(props || { _id: id });
    if (permanentDelete == true) {
      return await model.deleteOne(sanitizedProps);
    }
    logger.info(`Soft deleting ${model.modelName} with id: ${id}`);
    return await model.updateOne({ _id: id }, { $set: { is_active: false } });
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
    const sanitizedProps = sanitizeInput(props);
    return await model
      .find(sanitizedProps)
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
    const sanitizedProps = sanitizeInput(props);
    return await model
      .findOne(sanitizedProps)
      .populate(args1)
      .populate(args2)
      .populate(args3)
      .populate(args4)
      .exec();
  };

const aggregatedQuery =
  (model: Model<any, {}, {}>) => async (pipeline: any) => {
    logger.info(`Fetching all ${model.modelName} with props: ${pipeline}`);
    const sanitizedPipeline = pipeline.map(sanitizeInput);
    return await model.aggregate(sanitizedPipeline).exec();
  };

const getPaginated =
  (model: Model<any, {}, {}>) =>
  async (
    props: any,
    { page = 1, limit = 10 }: { page: number; limit: number },
    populate_opts: any = ""
  ) => {
    logger.info(
      `Fetching paginated ${model.modelName} with props: ${props}, page: ${page}, limit: ${limit}`
    );
    const sanitizedProps = sanitizeInput(props);
    const skip = (page - 1) * limit;
    return await model
      .find(sanitizedProps)
      .skip(skip)
      .limit(limit)
      .sort({ updated_at: -1 })
      .populate(populate_opts)
      .lean()
      .exec();
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
  getPaginated: getPaginated(model),
});

export default dataAccessLayer;
