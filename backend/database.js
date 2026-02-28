// 1. 引入sqlite3模块
// verbose模式会提供更详细的错误信息，对调试很有帮助
const sqlite3=require('sqlite3').verbose();
// 2. 引入path模块（处理文件路径）
const path=require('path');
// 3. 定义数据库文件的存放路径
// __dirname 是当前文件(database.js)所在的目录
// path.join() 会把路径片段连接成正确的路径格式
// 最终生成类似：D:/vscode/task-manager/backend/tasks.db
const dbPath=path.join(__dirname,'task.db')
// 4. 创建一个数据库连接
// 如果tasks.db文件不存在，sqlite3会自动创建它
const db=new sqlite3.Database(dbPath,(err) => {
    if(err){
        console.error('数据库连接失败:',err.message);
    }else{
        console.log('已连接到数据库:',dbPath);
        // 5. 创建任务表（如果表不存在的话）
        // 这是SQL语句，用来创建数据表
        createTable();
    }
});
// 6. 定义创建表的函数
function createTable(){
    // SQL语句：创建一个名为tasks的表
    const sql=`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 任务ID,整数类型,主键,自动增长
            text TEXT NOT NULL,                     -- 任务内容,文本类型,不能为空
            priority TEXT DEFAULT 'medium',         -- 优先级,默认'medium'
            completed BOOLEAN DEFAULT 0,            -- 是否完成,0=false,1=true,默认0
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 创建时间,默认当前时间
        )
    `;
    // 执行SQL语句
    db.run(sql,(err) => {
        if(err){
            console.error('创建表失败:',err.message);
        }else{
            console.log('任务表已就绪');
            // 7. 添加一些示例数据（可选）
            insertSampleData();
        }
    });
}
// 8. 插入一些示例数据（方便测试）
function insertSampleData(){
    // 先检查表中是否有数据
    db.get('SELECT COUNT(*) as count FROM tasks',(err,row) => {
        if(err){
            console.error('查询数据失败:',err.message);
            return;
        }
        // 如果表中没有数据（count为0），才插入示例数据
        if(row.count===0){
            console.log('添加示例数据...');
            // 插入三条示例任务
            const sampleTasks=[
                ['学习Node.js','high',0],
                ['写代码','medium',0],
                ['买咖啡','low',1]
            ];
            // 使用循环插入每条数据
            sampleTasks.forEach(task => {
                db.run(
                    'INSERT INTO tasks (text,priority,completed) VALUES (?,?,?)',
                    task,
                    function(err) {
                        if(err){
                            console.error('插入示例数据失败:',err.message);
                        }
                    }
                );
            });
            console.log('示例数据添加完成');
        }
    });
}
// 9. 导出数据库连接对象，供其他文件使用
module.exports=db;