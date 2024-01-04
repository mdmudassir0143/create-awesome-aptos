import { useEffect, useState } from "react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import './App.css'
import { Layout, Row, Col, Button, Spin, Checkbox, List, Input } from "antd";
import { Provider, Network } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { CheckboxChangeEvent } from "antd/es/checkbox";

type Task = {
  address: string;
  completed: boolean;
  content: string;
  task_id: string;
};

function App() {
  const [accountHasTodoList, setAccountHasTodoList] = useState<boolean>(false);
  const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<string>("");

  const { account, signAndSubmitTransaction } = useWallet();
  const provider = new Provider(Network.TESTNET);
  const moduleAddress = "0x867aaa80ea34707ae5f2af91f732fdf82038d746d9333291f83933326744af42";

  const fetchList = async () => {
    if (!account) return [];
    // change this to be your module account address
    try {
      const TodoListResource = await provider.getAccountResource(
        account.address,
        `${moduleAddress}::todolist::TodoList`
      );
      setAccountHasTodoList(true);

      // tasks table handle
      const tableHandle = (TodoListResource as any).data.tasks.handle;
      // tasks table counter
      const taskCounter = (TodoListResource as any).data.task_counter;

      let tasks = [];
      let counter = 1;
      while (counter <= taskCounter) {
        const tableItem = {
          key_type: "u64",
          value_type: `${moduleAddress}::todolist::Task`,
          key: `${counter}`,
        };
        const task = await provider.getTableItem(tableHandle, tableItem);
        tasks.push(task);
        counter++;
      }

      // set tasks in local state
      setTasks(tasks);
    } catch (e: any) {
      setAccountHasTodoList(false);
    }
  };

  const addNewList = async () => {
    if (!account) return [];
    setTransactionInProgress(true);
    // build a transaction payload to be submited
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::todolist::create_list`,
      type_arguments: [],
      arguments: [],
    };
    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(payload);
      // wait for transaction
      await provider.waitForTransaction(response.hash);
      setAccountHasTodoList(true);
    } catch (error: any) {
      setAccountHasTodoList(false);
    }
  };

  const onWriteTask = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNewTask(value);
  };

  const onTaskAdded = async () => {
    // check for connected account
    if (!account) return;
    setTransactionInProgress(true);
    // build a transaction payload to be submited
    const payload = {
      type: "entry_function_payload",
      function: `${moduleAddress}::todolist::create_task`,
      type_arguments: [],
      arguments: [newTask],
    };

    // hold the latest task.task_id from our local state
    const latestId = tasks.length > 0 ? parseInt(tasks[tasks.length - 1].task_id) + 1 : 1;

    // build a newTaskToPush object into our local state
    const newTaskToPush = {
      address: account.address,
      completed: false,
      content: newTask,
      task_id: latestId + "",
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(payload);
      // wait for transaction
      await provider.waitForTransaction(response.hash);

      // Create a new array based on current state:
      let newTasks = [...tasks];

      // Add item to the tasks array
      newTasks.push(newTaskToPush);
      // Set state
      setTasks(newTasks);
      // clear input text
      setNewTask("");
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  const onCheckboxChange = async (
    taskId: string
  ) => {
    if (!account) return;

    setTransactionInProgress(true);
    const payload = {
      type: "entry_function_payload",
      function:
        `${moduleAddress}::todolist::complete_task`,
      type_arguments: [],
      arguments: [taskId],
    };

    try {
      // sign and submit transaction to chain
      const response = await signAndSubmitTransaction(payload);
      // wait for transaction
      await provider.waitForTransaction(response.hash);

      setTasks((prevState) => {
        const newState = prevState.map((obj) => {
          // if task_id equals the checked taskId, update completed property
          if (obj.task_id === taskId) {
            return { ...obj, completed: true };
          }

          // otherwise return object as is
          return obj;
        });

        return newState;
      });
    } catch (error: any) {
      console.log("error", error);
    } finally {
      setTransactionInProgress(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [account?.address]);


  return (
    <>
      <div className="h-[100vh] border border-red-400 flex items-center  flex-col justify-center bg-teal-lightest font-sans">
        <div className="bg-white border border-blue-400 flex justify-end text-black rounded shadow px-6 py-2 m-4 w-1/1 lg:w-1/2 lg:max-w-lg">
          <WalletSelector />
        </div>
        <div className="bg-white border border-blue-400  rounded shadow p-6 m-4 w-1/1 lg:w-1/2 lg:max-w-lg">
          <div className="mb-4">
            <h1 className="text-blue-500 font-bold">Todo List</h1>
            <div className="flex mt-4">
              <input value={newTask} onChange={(event) => onWriteTask(event)} className="shadow appearance-none border rounded w-full py-2 px-3 mr-4 text-grey-darker" placeholder="Add Todo" />
              <button onClick={onTaskAdded} className="flex-no-shrink px-4 py-2 border-2 rounded text-teal border-teal hover:text-blue-500 hover:bg-teal">Add</button>
            </div>
          </div>
          <div>
            {tasks && tasks.map((task) => {
              return (
                <div className="flex mb-4 items-center">
                  <a  href={`https://explorer.aptoslabs.com/account/${task.address}/`} className={`${task.completed ? "line-through" : null}`}>{task.content}</a>
                    
                  {task.completed ? <button disabled className="flex-no-shrink px-3 ml-4 mr-2 border-2 font-medium rounded bg-green-300 text-white">Completed</button> : <button onClick={(event) =>
                    onCheckboxChange(task.task_id)
                  } className="flex-no-shrink p-2 ml-4 mr-2 border-2 rounded  hover:text-blue-500 text-grey border-grey hover:bg-grey">Done</button>}


                </div>
              );
            })}


          </div>
        </div>
      </div>
      
    </>
  );
}

export default App;