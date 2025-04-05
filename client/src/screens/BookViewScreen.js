import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { getBookDetails, getComments, postComment } from '../services/api';

export default function BookViewScreen() {
  const [book, setBook] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const bookId = 1;
  const groupId = 1;

  useEffect(() => {
    const fetchData = async () => {
      const bookData = await getBookDetails(bookId);
      setBook(bookData);
      const commentData = await getComments(bookId, groupId);
      setComments(commentData);
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePost = async () => {
    await postComment(bookId, groupId, newComment);
    setNewComment('');
    const updatedComments = await getComments(bookId, groupId);
    setComments(updatedComments);
  };

  return (
    <View>
      <Text>{book?.title || 'Loading...'}</Text>
      <Text>Group Comments:</Text>
      {comments.map((c, i) => <Text key={i}>{c.message}</Text>)}
      <TextInput value={newComment} onChangeText={setNewComment} placeholder="Add a comment" />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
}