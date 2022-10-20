import { Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

export default function Index() {
	const [todo, setTodo] = useState('1');

	const toggleTodoChange = () => {
		setTodo(todo === '1' ? '2' : '1');
	};

	return (
		<div>
			<div>
				<button onClick={toggleTodoChange} disabled={todo === '1'}>
					loc-1
				</button>
				<button onClick={toggleTodoChange} disabled={todo === '2'}>
					loc-2
				</button>
			</div>
			<TodoTitle todo={todo} />
		</div>
	);
}

const TodoTitle = ({ todo }: { todo: string }) => {
	const { isLoading, error, data, isFetching } = useQuery(['todosData', todo], async () => {
		const res = await axios.get(`https://jsonplaceholder.typicode.com/todos/${todo}`);
		return { title: res.data['title'] };
	});

	return <div>{JSON.stringify(data)}</div>;
};
