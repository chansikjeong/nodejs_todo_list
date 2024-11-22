import express from "express";
import Todo from "../schemas/todo.chema.js";
import Joi from "joi";

const router = express.Router();

/** 유효성 검사 **/
const createTodoSchema = Joi.object({
  value: Joi.string().min(1).max(50).required(),
});

/** 할일 등록 API **/
// /routes/todos.router.js

router.post("/todos", async (req, res, next) => {
  // 클라이언트에게 전달받은 value 데이터를 변수에 저장합니다.
  //   const { value } = req.body;
  try {
    const validation = await createTodoSchema.validateAsync(req.body);

    const { value } = validation;

    // value가 존재하지 않을 때, 클라이언트에게 에러 메시지를 전달합니다.
    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: "해야할 일 데이터가 존재하지 않습니다." });
    }

    // Todo모델을 사용해, MongoDB에서 'order' 값이 가장 높은 '해야할 일'을 찾습니다.
    const todoMaxOrder = await Todo.findOne().sort("-order").exec();

    // 'order' 값이 가장 높은 도큐멘트의 1을 추가하거나 없다면, 1을 할당합니다.
    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // Todo모델을 이용해, 새로운 '해야할 일'을 생성합니다.
    const todo = new Todo({ value, order });

    // 생성한 '해야할 일'을 MongoDB에 저장합니다.
    await todo.save();

    return res.status(201).json({ todo: todo });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ errorMessage: error.message });
    }

    return res
      .status(500)
      .json({ errorMessage: "서버에서 에러가 발생했습니다." });
  }
});

/** 해야할 일 목록 조회 API **/
router.get("/todos", async (req, res, next) => {
  //1 해야할 일 목록 조회 진행
  const todos = await Todo.find().sort("-order").exec();
  //2 해야할 일 목록 조회 결과 클라이언트에게 전달
  return res.status(200).json({ todos });
});

/** 해야할 일 순서 변경, 완료 / 해제, 내용 변경 API **/
router.patch("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  //현재 나의 order가 무엇인지 알아야한다.
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 입니다." });
  }
  // 순서변경
  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }

    currentTodo.order = order;
  }
  // 완료/해제
  if (done !== undefined) {
    currentTodo.doneAt = done ? new Date() : null;
  }
  // 내용 변경
  if (value) {
    currentTodo.value = value;
  }

  await currentTodo.save();

  return res.status(200).json({});
});

/** 할 일 삭제 api **/
router.delete("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;

  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 정보입니다." });
  }

  await Todo.deleteOne({ _id: todoId });
  return res.status(200).json({});
});

export default router;
